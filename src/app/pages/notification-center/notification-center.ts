import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AppointmentService } from '../../modules/appointments/appointment.service';
import { Appointment, AppointmentStatus } from '../../modules/appointments/models/appointment.models';
import { StockMaterialService } from '../../modules/stock/stock-material.service';
import { StockMaterial, LOW_STOCK_THRESHOLD } from '../../modules/stock/models/stock-material.models';
import { PedagogicalNoticeService } from '../../modules/notifications/pedagogical-notice.service';
import { PedagogicalNotice } from '../../modules/notifications/models/pedagogical-notice.models';

type NotificationKind = 'appointment' | 'stock' | 'pedagogical';
type NotificationLevel = 'high' | 'medium' | 'info';

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  level: NotificationLevel;
  title: string;
  message: string;
  when?: string;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.scss'
})
export class NotificationCenterComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private stockMaterialService = inject(StockMaterialService);
  private pedagogicalNoticeService = inject(PedagogicalNoticeService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<NotificationItem[]>([]);

  readonly appointmentCount = signal(0);
  readonly lowStockCount = signal(0);
  readonly noticeCount = signal(0);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);

    const today = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(today.getDate() + 7);

    forkJoin({
      appointments: this.appointmentService
        .list({
          startDate: toIsoDate(today),
          endDate: toIsoDate(inSevenDays),
          page: 1,
          pageSize: 50
        })
        .pipe(catchError(() => of({ items: [] as Appointment[], total: 0 }))),
      stock: this.stockMaterialService
        .list({ lowStockOnly: true, page: 1, pageSize: 50 })
        .pipe(catchError(() => of({ items: [] as StockMaterial[], total: 0 }))),
      notices: this.pedagogicalNoticeService
        .list(1, 20)
        .pipe(catchError(() => of({ items: [] as PedagogicalNotice[], total: 0 })))
    })
      .pipe(
        map(({ appointments, stock, notices }) => {
          const appointmentItems = this.mapAppointments(appointments.items);
          const stockItems = this.mapLowStock(stock.items);
          const noticeItems = this.mapNotices(notices.items);
          const merged = [...appointmentItems, ...stockItems, ...noticeItems];
          merged.sort(sortByWhenDesc);

          this.appointmentCount.set(appointmentItems.length);
          this.lowStockCount.set(stockItems.length);
          this.noticeCount.set(noticeItems.length);

          return merged;
        })
      )
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.items.set([]);
          this.loading.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
  }

  private mapAppointments(appointments: Appointment[]): NotificationItem[] {
    return appointments
      .filter((a) => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.COMPLETED)
      .map((a) => {
        const dateText = formatDateTime(a.startDateTime);
        return {
          id: `apt-${a.id}`,
          kind: 'appointment',
          level: 'medium',
          title: 'Cita próxima',
          message: `${a.patientName ?? 'Paciente'} ${a.treatment ? `- ${a.treatment}` : ''}`.trim(),
          when: dateText
        } satisfies NotificationItem;
      });
  }

  private mapLowStock(materials: StockMaterial[]): NotificationItem[] {
    return materials.map((m) => {
      const threshold = m.umbral_minimo ?? LOW_STOCK_THRESHOLD;
      return {
        id: `stock-${m.id}`,
        kind: 'stock',
        level: 'high',
        title: 'Stock bajo',
        message: `${m.nombre}: ${m.cantidad_actual} ${m.unidad} (umbral ${threshold})`,
        when: m.fecha_ultima_reposicion ? `Ult. reposición: ${formatDate(m.fecha_ultima_reposicion)}` : undefined
      } satisfies NotificationItem;
    });
  }

  private mapNotices(notices: PedagogicalNotice[]): NotificationItem[] {
    return notices.map((n) => ({
      id: `notice-${n.id}`,
      kind: 'pedagogical',
      level: n.requires_ack ? 'high' : 'info',
      title: n.title,
      message: n.body,
      when: n.published_at ? formatDateTime(n.published_at) : undefined
    }));
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para ver notificaciones.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      return `Error del servidor (${err.status}).`;
    }
    return 'No se pudieron cargar las notificaciones.';
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-ES');
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function sortByWhenDesc(a: NotificationItem, b: NotificationItem): number {
  const ta = Date.parse(a.when ?? '');
  const tb = Date.parse(b.when ?? '');
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return tb - ta;
}
