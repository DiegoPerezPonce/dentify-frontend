import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { Odontograma, OdontogramaToothStatusDTO } from './models/odontograma.models';

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
    return this.http.get<Odontograma[]>(`${API_BASE_URL}/patients/${patientId}/odontogramas`);
  }

  /**
   * POST crear odontograma vacío para un paciente.
   */
  create(patientId: number): Observable<Odontograma> {
    return this.http.post<Odontograma>(`${API_BASE_URL}/patients/${patientId}/odontogramas`, {});
  }

  /**
   * PUT actualizar estado de un diente/cara específico.
   */
  updateToothStatus(odontogramaId: number, dto: OdontogramaToothStatusDTO): Observable<Odontograma> {
    return this.http.put<Odontograma>(`${this.base}/${odontogramaId}/tooth-status`, dto);
  }
}
