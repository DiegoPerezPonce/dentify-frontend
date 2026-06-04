import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AppIconComponent } from '../../../shared/app-icon/app-icon.component';
import { AppointmentService } from '../appointment.service';
import { AppointmentSessionService } from '../appointment-session.service';
import { Appointment } from '../models/appointment.models';
import {
  AppointmentSession,
  AppointmentSessionMaterialLine,
  SessionMaterialLineUpdate
} from '../models/appointment-session.models';
import { StockMaterialService } from '../../stock/stock-material.service';
import { StockMaterial } from '../../stock/models/stock-material.models';

@Component({
  selector: 'app-appointment-session',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './appointment-session.html',
  styleUrl: './appointment-session.scss'
})
export class AppointmentSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private sessionService = inject(AppointmentSessionService);
  private stockService = inject(StockMaterialService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly appointment = signal<Appointment | null>(null);
  readonly session = signal<AppointmentSession | null>(null);
  readonly stockCatalog = signal<StockMaterial[]>([]);

  addMaterialId: number | null = null;
  addQty = 1;

  readonly appointmentId = computed(() => {
    const raw = this.route.snapshot.paramMap.get('appointmentId');
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) ? id : null;
  });

  readonly isCompleted = computed(() => this.session()?.status === 'completed');
  readonly materialLines = computed(() => this.session()?.materials ?? []);
  readonly materialCount = computed(() => this.materialLines().length);

  /** Filas visibles en el carrito antes de activar scroll interno. */
  private static readonly CART_VISIBLE_ROWS = 6;

  private readonly cartScrollRef = viewChild<ElementRef<HTMLDivElement>>('cartScroll');

  readonly cartNeedsScroll = computed(
    () => this.materialLines().length > AppointmentSessionComponent.CART_VISIBLE_ROWS
  );

  constructor() {
    effect(() => {
      this.materialLines();
      this.loading();
      queueMicrotask(() => this.applyCartScrollLimit());
    });

    afterNextRender(() => this.applyCartScrollLimit());
  }

  ngOnInit(): void {
    const id = this.appointmentId();
    if (id == null) {
      this.error.set('Cita no válida.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(appointmentId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.appointmentService.getById(appointmentId).subscribe({
      next: (appt) => {
        this.appointment.set(appt);
        this.sessionService.start(appointmentId).subscribe({
          next: (session) => {
            this.session.set(this.normalizeSession(session));
            this.loading.set(false);
            this.loadStockCatalog();
            queueMicrotask(() => this.applyCartScrollLimit());
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(this.parseError(err));
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.parseError(err));
      }
    });
  }

  loadStockCatalog(): void {
    this.stockService.list({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => this.stockCatalog.set(res.items ?? []),
      error: () => this.stockCatalog.set([])
    });
  }

  setLineQty(line: AppointmentSessionMaterialLine, value: number | string): void {
    const qty = this.parseIntegerQty(value);
    if (qty == null) return;
    line.cantidad_usada = qty;
  }

  /** Altura exacta de 6 filas medidas en DOM → scroll interno del carrito. */
  private applyCartScrollLimit(): void {
    requestAnimationFrame(() => {
      const el = this.cartScrollRef()?.nativeElement;
      if (!el) return;

      const rows = el.querySelectorAll<HTMLElement>('.material-row');
      const count = rows.length;
      const visibleRows = AppointmentSessionComponent.CART_VISIBLE_ROWS;

      if (count <= visibleRows) {
        el.style.removeProperty('max-height');
        el.style.removeProperty('height');
        el.style.removeProperty('overflow-y');
        el.style.removeProperty('overflow-x');
        return;
      }

      const first = rows[0];
      const lastVisible = rows[visibleRows - 1];
      const firstRect = first.getBoundingClientRect();
      const lastRect = lastVisible.getBoundingClientRect();
      const maxH = lastRect.bottom - firstRect.top;

      el.style.maxHeight = `${Math.ceil(maxH)}px`;
      el.style.height = `${Math.ceil(maxH)}px`;
      el.style.overflowY = 'auto';
      el.style.overflowX = 'hidden';
    });
  }

  onAddQtyChange(value: number | string): void {
    const qty = this.parseIntegerQty(value);
    this.addQty = qty ?? 1;
  }

  saveMaterials(): void {
    const id = this.appointmentId();
    const session = this.session();
    if (id == null || !session || session.status === 'completed') return;

    const payload: SessionMaterialLineUpdate[] = session.materials.map((m) => ({
      id: m.id,
      stock_material_id: m.stock_material_id,
      cantidad_usada: m.cantidad_usada,
      cantidad_planificada: m.cantidad_planificada
    }));

    this.saving.set(true);
    this.sessionService.syncMaterials(id, payload).subscribe({
      next: (updated) => {
        this.session.set(this.normalizeSession(updated));
        this.saving.set(false);
        queueMicrotask(() => this.applyCartScrollLimit());
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.parseError(err));
      }
    });
  }

  addMaterial(): void {
    const id = this.appointmentId();
    const stockId = this.addMaterialId;
    const qty = this.parseIntegerQty(this.addQty);
    if (id == null || stockId == null || qty == null) return;

    this.saving.set(true);
    this.sessionService
      .addMaterial(id, { stock_material_id: stockId, cantidad_usada: qty, cantidad_planificada: qty })
      .subscribe({
        next: (updated) => {
          this.session.set(this.normalizeSession(updated));
          this.addMaterialId = null;
          this.addQty = 1;
          this.saving.set(false);
          queueMicrotask(() => this.applyCartScrollLimit());
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.parseError(err));
        }
      });
  }

  removeLine(line: AppointmentSessionMaterialLine): void {
    const id = this.appointmentId();
    if (id == null || !line.id) return;

    this.saving.set(true);
    this.sessionService.removeMaterial(id, line.id).subscribe({
      next: (updated) => {
        this.session.set(this.normalizeSession(updated));
        this.saving.set(false);
        queueMicrotask(() => this.applyCartScrollLimit());
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.parseError(err));
      }
    });
  }

  completeSession(): void {
    const id = this.appointmentId();
    if (id == null) return;

    if (!confirm('¿Completar la cita y descontar el stock de los materiales listados?')) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload: SessionMaterialLineUpdate[] = (this.session()?.materials ?? []).map((m) => ({
      id: m.id,
      stock_material_id: m.stock_material_id,
      cantidad_usada: m.cantidad_usada,
      cantidad_planificada: m.cantidad_planificada
    }));

    this.sessionService.syncMaterials(id, payload).subscribe({
      next: () => {
        this.sessionService.complete(id).subscribe({
          next: (done) => {
            this.session.set(this.normalizeSession(done));
            this.saving.set(false);
            this.router.navigate(['/app/dashboard']);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(this.parseError(err));
          }
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.parseError(err));
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/app/dashboard']);
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private normalizeSession(session: AppointmentSession): AppointmentSession {
    return {
      ...session,
      materials: (session.materials ?? []).map((m) => ({
        ...m,
        cantidad_usada: this.parseIntegerQty(m.cantidad_usada) ?? 1,
        cantidad_planificada: this.parseIntegerQty(m.cantidad_planificada) ?? 1
      }))
    };
  }

  /** Cantidad entera positiva (unidades de stock). */
  private parseIntegerQty(value: number | string): number | null {
    const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    const qty = Math.trunc(n);
    if (qty <= 0) return null;
    return qty;
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; detail?: string } | string | null;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') {
        if (typeof body.message === 'string' && body.message.trim()) {
          return body.message;
        }
        if (typeof body.detail === 'string' && body.detail.trim()) {
          return body.detail;
        }
      }
      if (err.status === 0) {
        return 'No hay conexión con el servidor.';
      }
    }
    return 'No se pudo completar la operación.';
  }
}
