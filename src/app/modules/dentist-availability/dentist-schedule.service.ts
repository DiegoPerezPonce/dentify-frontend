import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  ClinicScheduleSavePayload,
  ClinicScheduleSettings,
  DentistWeeklySchedule,
  DentistWorkShift,
  WeeklyScheduleSavePayload
} from './models/dentist-schedule.models';

@Injectable({ providedIn: 'root' })
export class DentistScheduleService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/schedule`;

  getClinicSettings(): Observable<ClinicScheduleSettings> {
    return this.http.get<unknown>(`${this.base}/clinic`).pipe(map((r) => normalizeClinic(r)));
  }

  updateClinicSettings(payload: ClinicScheduleSavePayload): Observable<ClinicScheduleSettings> {
    return this.http.put<unknown>(`${this.base}/clinic`, payload).pipe(map((r) => normalizeClinic(r)));
  }

  getDentistWeekly(dentistId: number): Observable<DentistWeeklySchedule> {
    return this.http
      .get<unknown>(`${this.base}/dentists/${dentistId}/weekly`)
      .pipe(map((r) => normalizeWeekly(r)));
  }

  saveDentistWeekly(dentistId: number, payload: WeeklyScheduleSavePayload): Observable<DentistWeeklySchedule> {
    return this.http
      .put<unknown>(`${this.base}/dentists/${dentistId}/weekly`, payload)
      .pipe(map((r) => normalizeWeekly(r)));
  }

  getMyWeekly(): Observable<DentistWeeklySchedule> {
    return this.http.get<unknown>(`${this.base}/me/weekly`).pipe(map((r) => normalizeWeekly(r)));
  }

  getAvailableDentistIds(
    startDateTime: string,
    durationMinutes: number,
    excludeAppointmentId?: number | null
  ): Observable<number[]> {
    let params = new HttpParams()
      .set('startDateTime', startDateTime)
      .set('duration', String(durationMinutes));
    if (excludeAppointmentId != null) {
      params = params.set('excludeAppointmentId', String(excludeAppointmentId));
    }
    return this.http.get<unknown>(`${this.base}/dentists-available`, { params }).pipe(
      map((raw) => {
        const o = raw as Record<string, unknown>;
        const ids = o['dentistIds'];
        if (!Array.isArray(ids)) return [];
        return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      })
    );
  }

  getAvailableBoxIds(
    startDateTime: string,
    durationMinutes: number,
    excludeAppointmentId?: number | null
  ): Observable<number[]> {
    let params = new HttpParams()
      .set('startDateTime', startDateTime)
      .set('duration', String(durationMinutes));
    if (excludeAppointmentId != null) {
      params = params.set('excludeAppointmentId', String(excludeAppointmentId));
    }
    return this.http.get<unknown>(`${this.base}/boxes-available`, { params }).pipe(
      map((raw) => {
        const o = raw as Record<string, unknown>;
        const ids = o['boxIds'];
        if (!Array.isArray(ids)) return [];
        return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      })
    );
  }
}

function normalizeClinic(raw: unknown): ClinicScheduleSettings {
  const o = raw as Record<string, unknown>;
  return {
    openTime: String(o['openTime'] ?? '08:00'),
    closeTime: String(o['closeTime'] ?? '21:00'),
    morningEndTime: String(o['morningEndTime'] ?? '15:00'),
    afternoonStartTime: String(o['afternoonStartTime'] ?? '14:00'),
    overlapNote: (o['overlapNote'] as string | undefined) ?? undefined
  };
}

function normalizeWeekly(raw: unknown): DentistWeeklySchedule {
  const o = raw as Record<string, unknown>;
  const daysRaw = o['days'];
  const days = Array.isArray(daysRaw)
    ? daysRaw.map((d) => {
        const day = d as Record<string, unknown>;
        return {
          weekday: Number(day['weekday']),
          shift: String(day['shift'] ?? 'off') as DentistWorkShift,
          startTime: (day['startTime'] as string | null) ?? null,
          endTime: (day['endTime'] as string | null) ?? null,
          shiftLabel: (day['shiftLabel'] as string | null) ?? null
        };
      })
    : [];
  return {
    dentistId: Number(o['dentistId'] ?? 0),
    dentistName: (o['dentistName'] as string | undefined) ?? undefined,
    clinic: normalizeClinic(o['clinic'] ?? {}),
    days
  };
}
