import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base';
import {
  Appointment,
  AppointmentCreateDTO,
  AppointmentListQuery,
  AppointmentListResult,
  AppointmentStatus,
  AppointmentUpdateDTO
} from './models/appointment.models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/appointments`;

  /**
   * GET colección de citas con filtros opcionales
   */
  list(query: AppointmentListQuery = {}): Observable<AppointmentListResult> {
    let params = new HttpParams();

    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('itemsPerPage', String(query.pageSize));
    }
    if (query.startDate) {
      params = params.set('startDate', query.startDate);
    }
    if (query.endDate) {
      params = params.set('endDate', query.endDate);
    }
    if (query.dentistId) {
      params = params.set('dentistId', String(query.dentistId));
    }
    if (query.boxId) {
      params = params.set('boxId', String(query.boxId));
    }
    if (query.patientId) {
      params = params.set('patientId', String(query.patientId));
    }
    if (query.status) {
      params = params.set('status', query.status);
    }

    return this.http.get<unknown>(this.base, { params, observe: 'response' }).pipe(
      map((resp: HttpResponse<unknown>) => {
        const body = resp.body;
        const headerTotal = resp.headers.get('X-Total-Count');
        const parsed = normalizeListResponse(body);
        const withTotal =
          headerTotal && !Number.isNaN(Number(headerTotal))
            ? { ...parsed, total: Number(headerTotal) }
            : parsed;
        return {
          ...withTotal,
          items: withTotal.items.map((item) => normalizeAppointmentFromApi(item))
        };
      })
    );
  }

  /**
   * GET cita por ID
   */
  getById(id: number): Observable<Appointment> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((raw) => normalizeAppointmentFromApi(raw)));
  }

  /**
   * POST crear nueva cita
   */
  create(dto: AppointmentCreateDTO): Observable<Appointment> {
    return this.http
      .post<unknown>(this.base, toApiCreateBody(dto))
      .pipe(map((raw) => normalizeAppointmentFromApi(raw)));
  }

  /**
   * PUT actualizar cita existente
   */
  update(id: number, dto: AppointmentUpdateDTO): Observable<Appointment> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, toApiUpdateBody(dto))
      .pipe(map((raw) => normalizeAppointmentFromApi(raw)));
  }

  /**
   * DELETE eliminar cita
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * PUT cancelar cita (Symfony: estado cancelada)
   */
  cancel(id: number): Observable<Appointment> {
    return this.http
      .put<unknown>(`${this.base}/${id}/cancel`, {})
      .pipe(map((raw) => normalizeAppointmentFromApi(raw)));
  }

  /**
   * PUT reprogramar cita (fecha + hora + duración en snake_case)
   */
  reschedule(id: number, newStartDateTime: string, durationMinutes = 30): Observable<Appointment> {
    const { fecha, hora_inicio } = splitStartDateTime(newStartDateTime);
    return this.http
      .put<unknown>(`${this.base}/${id}/reschedule`, {
        fecha,
        hora_inicio,
        duracion: durationMinutes
      })
      .pipe(map((raw) => normalizeAppointmentFromApi(raw)));
  }
}

/** Symfony `AppointmentCreateDTO` / `AppointmentUpdateDTO` usan snake_case y fecha+hora separadas. */
const STATUS_TO_ESTADO: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'programada',
  [AppointmentStatus.CONFIRMED]: 'confirmada',
  [AppointmentStatus.COMPLETED]: 'completada',
  [AppointmentStatus.CANCELLED]: 'cancelada',
  [AppointmentStatus.NO_SHOW]: 'no_show'
};

function mapStatusToEstado(status?: AppointmentStatus): string {
  if (!status) return 'programada';
  return STATUS_TO_ESTADO[status] ?? 'programada';
}

function splitStartDateTime(iso: string): { fecha: string; hora_inicio: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid startDateTime: ${iso}`);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return { fecha: `${y}-${m}-${day}`, hora_inicio: `${h}:${min}:${s}` };
}

/** Cuerpo JSON esperado por Symfony `AppointmentCreateDTO`. */
interface ApiAppointmentCreateBody {
  pacienteId: number;
  odontologoId: number;
  boxId: number;
  fecha: string;
  hora_inicio: string;
  duracion: number;
  prioridad: string;
  estado: string;
  appointment_kind: string;
  catalog_treatment_id: number | null;
  treatment: string | null;
  isInfectious: boolean;
  notes: string | null;
}

/** Cuerpo JSON esperado por Symfony `AppointmentUpdateDTO` (campos opcionales). */
interface ApiAppointmentUpdateBody {
  pacienteId?: number;
  odontologoId?: number;
  boxId?: number;
  fecha?: string;
  hora_inicio?: string;
  duracion?: number;
  prioridad?: string;
  estado?: string;
  appointment_kind?: string;
  catalog_treatment_id?: number | null;
  treatment?: string;
  notes?: string;
  isInfectious?: boolean;
}

function toApiCreateBody(dto: AppointmentCreateDTO): ApiAppointmentCreateBody {
  const { fecha, hora_inicio } = splitStartDateTime(dto.startDateTime);
  const boxId = dto.boxId;
  if (boxId == null || Number.isNaN(Number(boxId))) {
    throw new Error('boxId is required to create an appointment');
  }
  return {
    pacienteId: dto.patientId,
    odontologoId: dto.dentistId,
    boxId: Number(boxId),
    fecha,
    hora_inicio,
    duracion: dto.duration,
    prioridad: dto.appointmentKind === 'urgencia' ? 'alta' : 'media',
    estado: mapStatusToEstado(dto.status),
    appointment_kind: dto.appointmentKind ?? 'tratamiento',
    catalog_treatment_id: dto.catalogTreatmentId ?? null,
    treatment: dto.treatment ?? null,
    isInfectious: dto.isInfectiousPatient ?? false,
    notes: dto.notes ?? null
  };
}

function toApiUpdateBody(dto: AppointmentUpdateDTO): ApiAppointmentUpdateBody {
  const body: ApiAppointmentUpdateBody = {};
  if (dto.patientId != null) body.pacienteId = dto.patientId;
  if (dto.dentistId != null) body.odontologoId = dto.dentistId;
  if (dto.boxId != null) body.boxId = dto.boxId;
  if (dto.startDateTime) {
    const { fecha, hora_inicio } = splitStartDateTime(dto.startDateTime);
    body.fecha = fecha;
    body.hora_inicio = hora_inicio;
  }
  if (dto.duration != null) body.duracion = dto.duration;
  if (dto.appointmentKind != null) body.appointment_kind = String(dto.appointmentKind);
  if (dto.catalogTreatmentId !== undefined) {
    body.catalog_treatment_id = dto.catalogTreatmentId ?? null;
  }
  if (dto.treatment !== undefined) body.treatment = dto.treatment;
  if (dto.notes !== undefined) body.notes = dto.notes;
  if (dto.isInfectiousPatient !== undefined) body.isInfectious = dto.isInfectiousPatient;
  if (dto.status != null) body.estado = mapStatusToEstado(dto.status);
  return body;
}

function normalizeListResponse(res: unknown): AppointmentListResult {
  if (res == null) return { items: [], total: 0 };
  if (Array.isArray(res)) {
    return { items: res as unknown as Appointment[], total: res.length };
  }
  const r = res as Record<string, unknown>;
  const hydraMember = r['hydra:member'];
  if (Array.isArray(hydraMember)) {
    const total = Number(r['hydra:totalItems'] ?? hydraMember.length);
    return {
      items: hydraMember as unknown as Appointment[],
      total: Number.isFinite(total) ? total : hydraMember.length
    };
  }
  if (Array.isArray(r['items'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['items'] as unknown[]).length);
    return { items: r['items'] as unknown as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['data'])) {
    const total = Number(r['total'] ?? r['totalCount'] ?? (r['data'] as unknown[]).length);
    return { items: r['data'] as unknown as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  if (Array.isArray(r['members'])) {
    const total = Number(r['totalItems'] ?? (r['members'] as unknown[]).length);
    return { items: r['members'] as unknown as Appointment[], total: Number.isFinite(total) ? total : 0 };
  }
  return { items: [], total: 0 };
}

/** Valores `estado` del API (Symfony) → enum del front. */
const API_ESTADO_TO_STATUS: Record<string, AppointmentStatus> = {
  programada: AppointmentStatus.SCHEDULED,
  confirmada: AppointmentStatus.CONFIRMED,
  completada: AppointmentStatus.COMPLETED,
  cancelada: AppointmentStatus.CANCELLED,
  no_show: AppointmentStatus.NO_SHOW
};

/**
 * Convierte la respuesta JSON del API (mezcla snake_case / camelCase y `estado` en español)
 * al modelo `Appointment` del front.
 */
export function normalizeAppointmentFromApi(raw: unknown): Appointment {
  const o = raw as Record<string, unknown>;
  const id = Number(o['id']);
  const patientId = Number(o['patientId'] ?? o['pacienteId'] ?? 0);
  const dentistId = Number(o['dentistId'] ?? o['odontologoId'] ?? 0);
  const boxRaw = o['boxId'];
  const boxId = boxRaw != null && boxRaw !== '' ? Number(boxRaw) : undefined;
  const duration = Number(o['duration'] ?? o['duracion'] ?? 30) || 30;

  let startDateTime = String(o['startDateTime'] ?? '');
  if (!startDateTime && o['fecha'] && o['hora_inicio']) {
    const fecha = String(o['fecha']);
    const hora = String(o['hora_inicio']);
    const horaNorm = hora.length === 5 ? `${hora}:00` : hora;
    const d = new Date(`${fecha}T${horaNorm}`);
    startDateTime = Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  let endDateTime = String(o['endDateTime'] ?? '');
  if (!endDateTime && startDateTime) {
    const d = new Date(startDateTime);
    d.setMinutes(d.getMinutes() + duration);
    endDateTime = d.toISOString();
  }

  const estadoRaw = String(o['status'] ?? o['estado'] ?? '').toLowerCase().trim();
  let status: AppointmentStatus = AppointmentStatus.SCHEDULED;
  if (API_ESTADO_TO_STATUS[estadoRaw]) {
    status = API_ESTADO_TO_STATUS[estadoRaw];
  } else if (Object.values(AppointmentStatus).includes(estadoRaw as AppointmentStatus)) {
    status = estadoRaw as AppointmentStatus;
  }

  const patientName = (o['patientName'] ?? o['pacienteNombre']) as string | undefined;
  const dentistName = (o['dentistName'] ?? o['odontologoNombre']) as string | undefined;
  const boxName = (o['boxName'] ?? o['boxNombre']) as string | undefined;
  const appointmentKind = (o['appointmentKind'] ?? o['appointment_kind']) as string | undefined;
  const catalogTreatmentIdRaw = o['catalogTreatmentId'] ?? o['catalog_treatment_id'];
  const catalogTreatmentId =
    catalogTreatmentIdRaw != null && catalogTreatmentIdRaw !== ''
      ? Number(catalogTreatmentIdRaw)
      : undefined;
  const specialtyName = (o['specialtyName'] ?? o['specialty_name']) as string | undefined;
  const treatment = (o['treatment'] as string | undefined) ?? undefined;
  const notes = (o['notes'] as string | undefined) ?? undefined;
  const isInfectiousPatient = Boolean(o['isInfectiousPatient'] ?? o['isInfectious'] ?? false);

  return {
    id,
    patientId,
    patientName: patientName?.trim() || undefined,
    dentistId,
    dentistName: dentistName?.trim() || undefined,
    boxId,
    boxName: boxName?.trim() || undefined,
    startDateTime,
    endDateTime,
    duration,
    appointmentKind: appointmentKind || undefined,
    catalogTreatmentId: Number.isFinite(catalogTreatmentId) ? catalogTreatmentId : undefined,
    specialtyName: specialtyName?.trim() || undefined,
    treatment,
    notes,
    status,
    isInfectiousPatient,
    createdAt: (o['createdAt'] as string | undefined) ?? undefined,
    updatedAt: (o['updatedAt'] as string | undefined) ?? undefined
  };
}

/** Valor para `<input type="datetime-local">` a partir de ISO u otro string parseable por `Date`. */
export function toDatetimeLocalInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
