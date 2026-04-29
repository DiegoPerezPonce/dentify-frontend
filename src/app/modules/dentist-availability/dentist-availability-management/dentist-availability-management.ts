import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DentistService } from '../../dentists/dentist.service';
import { Dentist } from '../../dentists/models/dentist.models';
import { DentistAvailabilityService } from '../dentist-availability.service';
import { DentistAvailabilitySlot, WEEKDAYS, Weekday } from '../models/dentist-availability.models';

@Component({
  selector: 'app-dentist-availability-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dentist-availability-management.html',
  styleUrl: './dentist-availability-management.scss'
})
export class DentistAvailabilityManagementComponent implements OnInit {
  private dentistService = inject(DentistService);
  private availabilityService = inject(DentistAvailabilityService);

  readonly dentists = signal<Dentist[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedDentistId = signal<number | null>(null);
  readonly slots = signal<DentistAvailabilitySlot[]>([]);
  readonly editingId = signal<string | null>(null);

  weekday: Weekday = 1;
  startTime = '09:00';
  endTime = '14:00';

  readonly weekdays = WEEKDAYS;
  readonly groupedByDay = computed(() => {
    const map = new Map<Weekday, DentistAvailabilitySlot[]>();
    for (const day of WEEKDAYS) map.set(day.value, []);
    for (const slot of this.slots()) {
      map.get(slot.weekday)?.push(slot);
    }
    for (const day of WEEKDAYS) {
      map.get(day.value)?.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  });

  ngOnInit(): void {
    this.loadDentists();
  }

  loadDentists(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dentistService.list().subscribe({
      next: (res) => {
        this.dentists.set(res.items);
        if (res.items.length > 0) {
          this.selectedDentistId.set(res.items[0].id);
          this.refreshSlots();
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  onDentistChange(value: string): void {
    const id = Number(value);
    this.selectedDentistId.set(Number.isFinite(id) ? id : null);
    this.cancelEdit();
    this.refreshSlots();
  }

  saveSlot(): void {
    const dentistId = this.selectedDentistId();
    if (!dentistId) {
      this.error.set('Selecciona un odontólogo.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const result = this.availabilityService.upsert(
      {
        dentistId,
        weekday: this.weekday,
        startTime: this.startTime,
        endTime: this.endTime
      },
      this.editingId() ?? undefined
    );

    this.saving.set(false);
    if (!result.ok) {
      this.error.set(result.message ?? 'No se pudo guardar la franja.');
      return;
    }

    this.refreshSlots();
    this.cancelEdit();
  }

  editSlot(slot: DentistAvailabilitySlot): void {
    this.editingId.set(slot.id);
    this.weekday = slot.weekday;
    this.startTime = slot.startTime;
    this.endTime = slot.endTime;
  }

  deleteSlot(slot: DentistAvailabilitySlot): void {
    this.availabilityService.remove(slot.id);
    this.refreshSlots();
    if (this.editingId() === slot.id) {
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.weekday = 1;
    this.startTime = '09:00';
    this.endTime = '14:00';
  }

  dayLabel(day: Weekday): string {
    return WEEKDAYS.find((d) => d.value === day)?.label ?? String(day);
  }

  trackBySlotId(_index: number, slot: DentistAvailabilitySlot): string {
    return slot.id;
  }

  private refreshSlots(): void {
    const id = this.selectedDentistId();
    this.slots.set(id ? this.availabilityService.listByDentist(id) : []);
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para gestionar disponibilidad.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      return `Error del servidor (${err.status}).`;
    }
    return 'No se pudo cargar la disponibilidad.';
  }
}
