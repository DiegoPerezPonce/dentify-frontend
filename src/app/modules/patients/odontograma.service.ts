import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  Odontograma,
  OdontogramaBridgeDTO,
  OdontogramaToothStatusDTO
} from './models/odontograma.models';

@Injectable({
  providedIn: 'root'
})
export class OdontogramaService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/odontograma`;

  /**
   * GET odontogramas de un paciente.
   */
  getByPatientId(patientId: number): Observable<Odontograma[]> {
    return this.http
      .get<Odontograma[]>(`${API_BASE_URL}/patients/${patientId}/odontogramas`)
      .pipe(map((list) => list.map((o) => this.normalizeOdontograma(o))));
  }

  private normalizeOdontograma(raw: Odontograma): Odontograma {
    const puentes = raw.puentes ?? [];
    const dientes = { ...raw.dientes };
    delete (dientes as Record<string, unknown>)['_puentes'];
    return { ...raw, puentes, dientes };
  }

  /**
   * POST crear odontograma vacío para un paciente.
   */
  create(patientId: number): Observable<Odontograma> {
    return this.http
      .post<Odontograma>(`${API_BASE_URL}/patients/${patientId}/odontogramas`, {})
      .pipe(map((o) => this.normalizeOdontograma(o)));
  }

  /**
   * PUT actualizar estado de un diente/cara específico.
   */
  updateToothStatus(odontogramaId: number, dto: OdontogramaToothStatusDTO): Observable<Odontograma> {
    return this.http
      .put<Odontograma>(`${this.base}/${odontogramaId}/tooth-status`, dto)
      .pipe(map((o) => this.normalizeOdontograma(o)));
  }

  /** Quita el estado de una cara (vuelve a blanco / sin marcar). */
  clearToothStatus(odontogramaId: number, diente: string, cara: string): Observable<Odontograma> {
    const params = new HttpParams().set('diente', diente).set('cara', cara);
    return this.http
      .delete<Odontograma>(`${this.base}/${odontogramaId}/tooth-status`, { params })
      .pipe(map((o) => this.normalizeOdontograma(o)));
  }

  addBridge(odontogramaId: number, dto: OdontogramaBridgeDTO): Observable<Odontograma> {
    return this.http
      .post<Odontograma>(`${this.base}/${odontogramaId}/bridge`, dto)
      .pipe(map((o) => this.normalizeOdontograma(o)));
  }

  deleteBridge(odontogramaId: number, bridgeId: string): Observable<Odontograma> {
    const params = new HttpParams().set('id', bridgeId);
    return this.http
      .delete<Odontograma>(`${this.base}/${odontogramaId}/bridge`, { params })
      .pipe(map((o) => this.normalizeOdontograma(o)));
  }
}
