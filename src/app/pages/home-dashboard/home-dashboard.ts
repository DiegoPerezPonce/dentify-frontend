import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { interval, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { ROLE_ADMIN } from '../../core/utils/jwt-roles';
import { AppointmentService } from '../../modules/appointments/appointment.service';
import { Appointment, AppointmentStatus } from '../../modules/appointments/models/appointment.models';
import { BoxService } from '../../modules/boxes/box.service';
import { Box } from '../../modules/boxes/models/box.models';
import { StockMaterial } from '../../modules/stock/models/stock-material.models';
import { StockMaterialService } from '../../modules/stock/stock-material.service';

export type AppointmentStatusUi = 'registered' | 'confirmed' | 'tentative' | 'locked';

export interface DashboardAppointment {
  id: number;
  patientId: number;
  startIso: string;
  timeLabel: string;
  status: AppointmentStatusUi;
  patientName: string;
  patientRef: string;
  treatmentLine: string;
  active: boolean;
}

export interface DashboardBox {
  id: number;
  label: string;
  state: 'busy' | 'free' | 'maint' | 'student';
  detail: string;
}

export interface DashboardCalendarEvent {
  id: number;
  timeLabel: string;
  title: string;
  accent: 'cyan' | 'amber';
}

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss'
})
export class HomeDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private appointmentService = inject(AppointmentService);
  private boxService = inject(BoxService);
  private stockService = inject(StockMaterialService);

  readonly ROLE_ADMIN = ROLE_ADMIN;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly appointments = signal<DashboardAppointment[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly stockItems = signal<StockMaterial[]>([]);
  readonly stockAlertTotal = signal(0);

  readonly dashNow = toSignal(interval(60_000).pipe(map(() => new Date()), startWith(new Date())), {
    initialValue: new Date()
  });

  readonly doctorName = computed(() => {
    this.dashNow();
    return this.auth.getDisplayName()?.trim() || this.translate.instant('NAV.DEFAULT_USER');
  });

  readonly greetingKey = computed(() => {
    const h = this.dashNow().getHours();
    if (h >= 5 && h < 12) return 'HOME_DASH.GREET_MORNING';
    if (h >= 12 && h < 20) return 'HOME_DASH.GREET_AFTERNOON';
    return 'HOME_DASH.GREET_EVENING';
  });

  readonly monthTitle = computed(() => {
    const d = this.dashNow();
    const lang = this.translate.currentLang || 'es';
    try {
      return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(d);
    } catch {
      return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(d);
    }
  });

  readonly calendarWeeks = computed(() => buildMonthGrid(this.dashNow()));

  readonly calendarEvents = computed(() => {
    const list = this.appointments().slice(0, 6);
    return list.map((a, i) => ({
      id: a.id,
      timeLabel: a.timeLabel,
      title: `${a.patientName} · ${a.treatmentLine}`,
      accent: (i % 2 === 0 ? 'cyan' : 'amber') as 'cyan' | 'amber'
    }));
  });

  readonly patientsTodayCount = computed(() => {
    const ids = new Set(this.appointments().map((a) => a.patientId));
    return ids.size;
  });

  readonly boxesOccupiedCount = computed(() => {
    const items = this.boxes();
    if (!items.length) return 0;
    return items.filter((b) => (b.estado || '').toLowerCase() !== 'disponible').length;
  });

  readonly boxesTotal = computed(() => this.boxes().length);

  readonly boxesOccupiedPct = computed(() => {
    const t = this.boxesTotal();
    if (!t) return 0;
    return Math.min(100, Math.round((this.boxesOccupiedCount() / t) * 100));
  });

  readonly nextApptHint = computed(() => {
    this.dashNow();
    const now = Date.now();
    const upcoming = this.appointments().find((a) => new Date(a.startIso).getTime() > now);
    if (!upcoming) {
      return this.translate.instant('HOME_DASH.STAT_PATIENTS_HINT_NONE');
    }
    return this.translate.instant('HOME_DASH.STAT_PATIENTS_HINT_NEXT', {
      time: upcoming.timeLabel,
      name: upcoming.patientName
    });
  });

  readonly boxCards = computed((): DashboardBox[] => this.boxes().map(mapBoxToDashboard));

  readonly hasDentistScope = computed(() => this.auth.getDentistId() != null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    const today = formatApiDate(new Date());
    const dentistId = this.auth.getDentistId();

    const apptQuery: {
      startDate: string;
      endDate: string;
      pageSize: number;
      page: number;
      dentistId?: number;
    } = {
      startDate: today,
      endDate: today,
      pageSize: 200,
      page: 1
    };
    if (dentistId != null) {
      apptQuery.dentistId = dentistId;
    }

    forkJoin({
      appts: this.appointmentService.list(apptQuery).pipe(
        catchError(() => of({ items: [] as Appointment[], total: 0 }))
      ),
      boxes: this.boxService.list().pipe(catchError(() => of({ items: [] as Box[], total: 0 }))),
      stock: this.stockService
        .list({ lowStockOnly: true, page: 1, pageSize: 15 })
        .pipe(catchError(() => of({ items: [] as StockMaterial[], total: 0 })))
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ appts, boxes, stock }) => {
          const raw = (appts.items ?? [])
            .filter((a) => a.status !== AppointmentStatus.CANCELLED)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

          const now = Date.now();
          const mapped = raw.map((a) => mapAppointmentToDashboard(a, now));
          this.appointments.set(mapped);

          this.boxes.set(boxes.items ?? []);
          this.stockItems.set(stock.items ?? []);
          this.stockAlertTotal.set(
            typeof stock.total === 'number' && stock.total >= 0 ? stock.total : (stock.items?.length ?? 0)
          );
        },
        error: () => {
          this.error.set(this.translate.instant('HOME_DASH.ERR_LOAD'));
        }
      });
  }

  stockDetail(m: StockMaterial): string {
    const min = m.umbral_minimo ?? '—';
    return this.translate.instant('HOME_DASH.STOCK_ROW_DETAIL', {
      qty: m.cantidad_actual,
      unit: m.unidad || '—',
      min
    });
  }

  isAdmin(): boolean {
    return this.auth.hasRole(ROLE_ADMIN);
  }
}

function formatApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapAppointmentToDashboard(a: Appointment, nowMs: number): DashboardAppointment {
  const start = new Date(a.startDateTime).getTime();
  const end = new Date(a.endDateTime || a.startDateTime).getTime();
  const active = nowMs >= start && nowMs <= end && a.status !== AppointmentStatus.COMPLETED;

  const timeLabel = formatTimeLabel(a.startDateTime);
  const patientName = (a.patientName || '').trim() || '—';
  const treatmentLine = (a.treatment || '').trim() || '—';

  let ui: AppointmentStatusUi = 'tentative';
  if (a.status === AppointmentStatus.CONFIRMED) ui = 'confirmed';
  else if (a.status === AppointmentStatus.COMPLETED) ui = 'registered';
  else if (a.status === AppointmentStatus.NO_SHOW) ui = 'locked';
  else if (a.status === AppointmentStatus.SCHEDULED) ui = 'tentative';

  return {
    id: a.id,
    patientId: a.patientId,
    startIso: a.startDateTime,
    timeLabel,
    status: ui,
    patientName,
    patientRef: `#PAC-${a.patientId}`,
    treatmentLine,
    active
  };
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function mapBoxToDashboard(box: Box): DashboardBox {
  const est = (box.estado || '').toLowerCase();
  let state: DashboardBox['state'] = 'student';
  if (est === 'disponible') state = 'free';
  else if (est === 'ocupado') state = 'busy';
  else if (est === 'mantenimiento' || est.includes('manten') || est.includes('fuera')) state = 'maint';

  const parts = [box.dentistNombre?.trim(), (box.descripcion || '').trim(), box.estado].filter(Boolean);
  const detail = parts.length ? parts.join(' · ') : '—';

  return {
    id: box.id,
    label: box.nombre || `Box ${box.id}`,
    state,
    detail
  };
}

export type CalendarCell = { day: number; isToday: boolean } | null;

function buildMonthGrid(ref: Date): CalendarCell[][] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const todayD = ref.getDate();
  const first = new Date(y, m, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < mondayOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isToday: d === todayD });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
