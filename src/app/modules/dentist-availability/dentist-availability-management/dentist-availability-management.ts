import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DentistService } from '../../dentists/dentist.service';
import { Dentist } from '../../dentists/models/dentist.models';
import { DentistScheduleService } from '../dentist-schedule.service';
import {
  ClinicScheduleSavePayload,
  ClinicScheduleSettings,
  DentistWorkShift,
  SHIFT_OPTIONS,
  WEEKDAYS_MON_SAT,
  WeeklyScheduleDay,
  defaultWeekDraft
} from '../models/dentist-schedule.models';

@Component({
  selector: 'app-dentist-availability-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dentist-availability-management.html',
  styleUrl: './dentist-availability-management.scss'
})
export class DentistAvailabilityManagementComponent implements OnInit {
  private dentistService = inject(DentistService);
  private scheduleService = inject(DentistScheduleService);

  readonly shiftOptions = SHIFT_OPTIONS;
  readonly weekdays = WEEKDAYS_MON_SAT;

  readonly dentists = signal<Dentist[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingClinic = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly clinicSuccess = signal<string | null>(null);

  readonly selectedDentistId = signal<number | null>(null);
  readonly clinic = signal<ClinicScheduleSettings | null>(null);
  readonly clinicDraft = signal<ClinicScheduleSavePayload>({
    openTime: '08:00',
    closeTime: '21:00',
    morningEndTime: '15:00',
    afternoonStartTime: '14:00'
  });
  readonly weekDraft = signal<WeeklyScheduleDay[]>(defaultWeekDraft());

  readonly overlapHint = computed(() => {
    const c = this.clinicDraft();
    return `${c.afternoonStartTime} – ${c.morningEndTime}`;
  });

  readonly selectedDentistName = computed(() => {
    const id = this.selectedDentistId();
    const d = this.dentists().find((x) => x.id === id);
    return d ? `${d.nombre} ${d.apellidos}`.trim() : '';
  });

  ngOnInit(): void {
    this.loadInitial();
  }

  loadInitial(): void {
    this.loading.set(true);
    this.error.set(null);
    this.scheduleService.getClinicSettings().subscribe({
      next: (clinic) => {
        this.clinic.set(clinic);
        this.clinicDraft.set({
          openTime: clinic.openTime,
          closeTime: clinic.closeTime,
          morningEndTime: clinic.morningEndTime,
          afternoonStartTime: clinic.afternoonStartTime
        });
        this.loadDentists();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
        this.loadDentists();
      }
    });
  }

  loadDentists(): void {
    this.dentistService.list().subscribe({
      next: (res) => {
        this.dentists.set(res.items);
        if (res.items.length > 0 && this.selectedDentistId() == null) {
          this.selectedDentistId.set(res.items[0].id);
          this.loadWeeklySchedule(res.items[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  onClinicFieldChange(field: keyof ClinicScheduleSavePayload, value: string): void {
    const normalized = value.length >= 5 ? value.slice(0, 5) : value;
    this.clinicDraft.update((c) => ({ ...c, [field]: normalized }));
    this.clinicSuccess.set(null);
    this.refreshWeekDraftTimes();
  }

  saveClinicSettings(): void {
    const draft = this.clinicDraft();
    const validationError = this.validateClinicDraft(draft);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.savingClinic.set(true);
    this.error.set(null);
    this.clinicSuccess.set(null);

    this.scheduleService.updateClinicSettings(draft).subscribe({
      next: (saved) => {
        this.clinic.set(saved);
        this.clinicDraft.set({
          openTime: saved.openTime,
          closeTime: saved.closeTime,
          morningEndTime: saved.morningEndTime,
          afternoonStartTime: saved.afternoonStartTime
        });
        this.refreshWeekDraftTimes();
        this.savingClinic.set(false);
        this.clinicSuccess.set('Horario de la clínica guardado correctamente.');
      },
      error: (err) => {
        this.savingClinic.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  onDentistChange(value: string): void {
    const id = Number(value);
    if (!Number.isFinite(id)) return;
    this.selectedDentistId.set(id);
    this.success.set(null);
    this.loadWeeklySchedule(id);
  }

  shiftFor(weekday: number): DentistWorkShift {
    return this.weekDraft().find((d) => d.weekday === weekday)?.shift ?? 'off';
  }

  timeHintFor(weekday: number): string {
    const day = this.weekDraft().find((d) => d.weekday === weekday);
    if (!day?.startTime || !day?.endTime) return '—';
    return `${day.startTime} – ${day.endTime}`;
  }

  onShiftChange(weekday: number, shift: string): void {
    const next = this.weekDraft().map((d) => {
      if (d.weekday !== weekday) return d;
      const typed = shift as DentistWorkShift;
      const range = this.resolveShiftRange(typed);
      return {
        ...d,
        shift: typed,
        shiftLabel: SHIFT_OPTIONS.find((o) => o.value === typed)?.label ?? null,
        startTime: range?.start ?? null,
        endTime: range?.end ?? null
      };
    });
    this.weekDraft.set(next);
    this.success.set(null);
  }

  private resolveShiftRange(shift: DentistWorkShift): { start: string; end: string } | null {
    const c = this.clinicDraft();
    if (!c || shift === 'off') return null;
    if (shift === 'morning') return { start: c.openTime, end: c.morningEndTime };
    if (shift === 'afternoon') return { start: c.afternoonStartTime, end: c.closeTime };
    if (shift === 'full_day') return { start: c.openTime, end: c.closeTime };
    return null;
  }

  private refreshWeekDraftTimes(): void {
    this.weekDraft.update((days) =>
      days.map((d) => {
        const range = this.resolveShiftRange(d.shift);
        return {
          ...d,
          shiftLabel: SHIFT_OPTIONS.find((o) => o.value === d.shift)?.label ?? null,
          startTime: range?.start ?? null,
          endTime: range?.end ?? null
        };
      })
    );
  }

  private validateClinicDraft(draft: ClinicScheduleSavePayload): string | null {
    const open = this.timeToMinutes(draft.openTime);
    const close = this.timeToMinutes(draft.closeTime);
    const morningEnd = this.timeToMinutes(draft.morningEndTime);
    const afternoonStart = this.timeToMinutes(draft.afternoonStartTime);

    if ([open, close, morningEnd, afternoonStart].some((m) => m < 0)) {
      return 'Introduce horas válidas (formato HH:MM).';
    }
    if (open >= close) {
      return 'La hora de apertura debe ser anterior a la de cierre.';
    }
    if (morningEnd <= open || morningEnd > close) {
      return 'El fin del turno de mañana debe estar entre apertura y cierre.';
    }
    if (afternoonStart < open || afternoonStart > close) {
      return 'El inicio del turno de tarde debe estar entre apertura y cierre.';
    }
    if (afternoonStart > morningEnd) {
      return 'El solape no es válido: el inicio de tarde no puede ser posterior al fin de mañana.';
    }
    return null;
  }

  private timeToMinutes(value: string): number {
    const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) return -1;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  saveSchedule(): void {
    const dentistId = this.selectedDentistId();
    if (!dentistId) {
      this.error.set('Selecciona un odontólogo.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    this.scheduleService
      .saveDentistWeekly(dentistId, {
        days: this.weekDraft().map((d) => ({
          weekday: d.weekday,
          shift: d.shift,
          defaultBoxId: d.defaultBoxId ?? null
        }))
      })
      .subscribe({
        next: (saved) => {
          this.weekDraft.set(saved.days.length ? saved.days : defaultWeekDraft());
          this.saving.set(false);
          this.success.set('Horario guardado correctamente.');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
  }

  private loadWeeklySchedule(dentistId: number): void {
    this.loading.set(true);
    this.scheduleService.getDentistWeekly(dentistId).subscribe({
      next: (data) => {
        this.clinic.set(data.clinic);
        this.clinicDraft.set({
          openTime: data.clinic.openTime,
          closeTime: data.clinic.closeTime,
          morningEndTime: data.clinic.morningEndTime,
          afternoonStartTime: data.clinic.afternoonStartTime
        });
        this.weekDraft.set(data.days.length ? data.days : defaultWeekDraft());
        this.refreshWeekDraftTimes();
        this.loading.set(false);
      },
      error: (err) => {
        this.weekDraft.set(defaultWeekDraft());
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para gestionar horarios.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      const msg = err.error?.message;
      return typeof msg === 'string' && msg ? msg : `Error del servidor (${err.status}).`;
    }
    return 'No se pudo completar la operación.';
  }
}
