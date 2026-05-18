import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { DentistScheduleService } from '../../dentist-availability/dentist-schedule.service';
import {
  DentistWeeklySchedule,
  WEEKDAYS_MON_SAT,
  WeeklyScheduleDay
} from '../../dentist-availability/models/dentist-schedule.models';

@Component({
  selector: 'app-dentist-schedule-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dentist-schedule-view-modal.html',
  styleUrl: './dentist-schedule-view-modal.scss'
})
export class DentistScheduleViewModalComponent implements OnChanges {
  private scheduleService = inject(DentistScheduleService);

  @Input() isOpen = false;
  @Input() dentistId: number | null = null;
  @Input() dentistName = '';
  /** Si true, usa GET /api/schedule/me/weekly (horario del usuario actual). */
  @Input() useOwnSchedule = false;

  @Output() close = new EventEmitter<void>();

  readonly weekdays = WEEKDAYS_MON_SAT;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly schedule = signal<DentistWeeklySchedule | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] || changes['dentistId'] || changes['useOwnSchedule']) && this.isOpen) {
      this.loadSchedule();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.schedule.set(null);
      this.error.set(null);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  dayLabel(weekday: number): string {
    return this.weekdays.find((d) => d.weekday === weekday)?.label ?? String(weekday);
  }

  rowHint(day: WeeklyScheduleDay): string {
    if (day.shift === 'off') return 'Libre';
    if (day.startTime && day.endTime) {
      return `${day.shiftLabel ?? ''} · ${day.startTime} – ${day.endTime}`.trim();
    }
    return day.shiftLabel ?? day.shift;
  }

  private loadSchedule(): void {
    this.loading.set(true);
    this.error.set(null);
    this.schedule.set(null);

    const request$ =
      this.dentistId != null
        ? this.scheduleService.getDentistWeekly(this.dentistId)
        : this.scheduleService.getMyWeekly();

    request$.subscribe({
      next: (data) => {
        this.schedule.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) return 'No tienes permiso para ver este horario.';
      if (err.status === 404) return 'No se encontró el horario.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      const msg = err.error?.message;
      return typeof msg === 'string' && msg ? msg : `Error del servidor (${err.status}).`;
    }
    return 'No se pudo cargar el horario.';
  }
}
