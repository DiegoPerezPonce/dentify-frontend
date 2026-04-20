import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { PrimeraVisita, PrimeraVisitaCreateDTO } from './models/primera-visita.models';

@Injectable({
  providedIn: 'root'
})
export class PrimeraVisitaService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/primera-visita`;

  /**
   * POST crear registro de primera visita.
   */
  create(dto: PrimeraVisitaCreateDTO): Observable<PrimeraVisita> {
    return this.http.post<PrimeraVisita>(this.base, dto);
  }
}
