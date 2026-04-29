import { Injectable } from '@angular/core';
import {
  DentistAvailabilitySlot,
  DentistAvailabilityValidationResult
} from './models/dentist-availability.models';

@Injectable({
  providedIn: 'root'
})
export class DentistAvailabilityService {
  private readonly storageKey = 'dentify_dentist_availability_v1';

  listAll(): DentistAvailabilitySlot[] {
    return this.read().sort((a, b) => {
      if (a.dentistId !== b.dentistId) return a.dentistId - b.dentistId;
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  listByDentist(dentistId: number): DentistAvailabilitySlot[] {
    return this.listAll().filter((s) => s.dentistId === dentistId);
  }

  upsert(slot: Omit<DentistAvailabilitySlot, 'id'>, editingId?: string): DentistAvailabilityValidationResult {
    const all = this.read();
    const validation = this.validate(slot, all, editingId);
    if (!validation.ok) return validation;

    if (editingId) {
      const idx = all.findIndex((s) => s.id === editingId);
      if (idx >= 0) {
        all[idx] = { ...slot, id: editingId };
      } else {
        all.push({ ...slot, id: crypto.randomUUID() });
      }
    } else {
      all.push({ ...slot, id: crypto.randomUUID() });
    }

    this.write(all);
    return { ok: true };
  }

  remove(id: string): void {
    this.write(this.read().filter((s) => s.id !== id));
  }

  private validate(
    input: Omit<DentistAvailabilitySlot, 'id'>,
    all: DentistAvailabilitySlot[],
    editingId?: string
  ): DentistAvailabilityValidationResult {
    const start = toMinutes(input.startTime);
    const end = toMinutes(input.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return { ok: false, message: 'Hora inválida. Usa formato HH:mm.' };
    }
    if (start >= end) {
      return { ok: false, message: 'La hora de inicio debe ser menor que la de fin.' };
    }

    const sameDentistDay = all.filter(
      (s) => s.dentistId === input.dentistId && s.weekday === input.weekday && s.id !== editingId
    );
    for (const s of sameDentistDay) {
      const sStart = toMinutes(s.startTime);
      const sEnd = toMinutes(s.endTime);
      const overlaps = start < sEnd && end > sStart;
      if (overlaps) {
        return { ok: false, message: `Solape con franja existente ${s.startTime}-${s.endTime}.` };
      }
    }

    return { ok: true };
  }

  private read(): DentistAvailabilitySlot[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as DentistAvailabilitySlot[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(items: DentistAvailabilitySlot[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  return h * 60 + m;
}
