import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  AppointmentSession,
  SessionMaterialInput,
  SessionMaterialLineUpdate
} from './models/appointment-session.models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentSessionService {
  private http = inject(HttpClient);

  private base(appointmentId: number): string {
    return `${API_BASE_URL}/appointments/${appointmentId}/session`;
  }

  get(appointmentId: number): Observable<AppointmentSession> {
    return this.http.get<AppointmentSession>(this.base(appointmentId));
  }

  start(appointmentId: number): Observable<AppointmentSession> {
    return this.http.post<AppointmentSession>(`${this.base(appointmentId)}/start`, {});
  }

  addMaterial(appointmentId: number, input: SessionMaterialInput): Observable<AppointmentSession> {
    return this.http.post<AppointmentSession>(`${this.base(appointmentId)}/materials`, input);
  }

  syncMaterials(appointmentId: number, materials: SessionMaterialLineUpdate[]): Observable<AppointmentSession> {
    return this.http.put<AppointmentSession>(`${this.base(appointmentId)}/materials`, { materials });
  }

  removeMaterial(appointmentId: number, lineId: number): Observable<AppointmentSession> {
    return this.http.delete<AppointmentSession>(`${this.base(appointmentId)}/materials/${lineId}`);
  }

  complete(appointmentId: number, notes?: string): Observable<AppointmentSession> {
    return this.http.post<AppointmentSession>(`${this.base(appointmentId)}/complete`, { notes: notes ?? null });
  }
}
