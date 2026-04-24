import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import { Radiografia } from './models/radiografia.models';

@Injectable({
  providedIn: 'root'
})
export class RadiografiaService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/radiografias`;

  /**
   * GET radiografías de un paciente.
   */
  getByPatientId(patientId: number): Observable<Radiografia[]> {
    return this.http.get<Radiografia[]>(`${API_BASE_URL}/patients/${patientId}/radiografias`);
  }

  /**
   * POST subir múltiples radiografías.
   */
  upload(patientId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('patient_id', patientId.toString());
    
    // Enviar cada archivo con el mismo nombre de campo para que Symfony los reciba como array
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file, file.name);
    });

    return this.http.post(`${this.base}/upload`, formData);
  }

  /**
   * DELETE eliminar radiografía.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * POST reemplazar radiografía existente.
   */
  replace(id: number, file: File): Observable<Radiografia> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<Radiografia>(`${this.base}/${id}/replace`, formData);
  }

  /**
   * Construye la URL completa para mostrar una radiografía.
   */
  getFileUrl(rutaArchivo: string): string {
    // El backend sirve desde http://127.0.0.1:8000
    return `http://127.0.0.1:8000${rutaArchivo}`;
  }
}
