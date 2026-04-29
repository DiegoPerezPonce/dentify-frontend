import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PedagogicalNotice,
  PedagogicalNoticeCreateDTO,
  PedagogicalNoticeUpdateDTO
} from '../models/pedagogical-notice.models';
import { PedagogicalNoticeService } from '../pedagogical-notice.service';

@Component({
  selector: 'app-pedagogical-notice-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedagogical-notice-admin.html',
  styleUrl: './pedagogical-notice-admin.scss'
})
export class PedagogicalNoticeAdminComponent implements OnInit {
  private noticeService = inject(PedagogicalNoticeService);

  readonly notices = signal<PedagogicalNotice[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly editingId = signal<number | null>(null);

  formTitle = '';
  formBody = '';
  formActive = true;
  formRequiresAck = false;
  formPublishedAt = '';
  formExpiresAt = '';

  ngOnInit(): void {
    this.loadNotices();
  }

  loadNotices(): void {
    this.loading.set(true);
    this.error.set(null);

    this.noticeService.listManage(1, 100).subscribe({
      next: (res) => {
        this.notices.set(res.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.notices.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.formTitle = '';
    this.formBody = '';
    this.formActive = true;
    this.formRequiresAck = false;
    this.formPublishedAt = toLocalDatetimeInput(new Date());
    this.formExpiresAt = '';
    this.modalOpen.set(true);
  }

  openEditModal(item: PedagogicalNotice): void {
    this.editingId.set(item.id);
    this.formTitle = item.title ?? '';
    this.formBody = item.body ?? '';
    this.formActive = item.active ?? true;
    this.formRequiresAck = item.requires_ack ?? false;
    this.formPublishedAt = item.published_at ? toLocalDatetimeInput(new Date(item.published_at)) : '';
    this.formExpiresAt = item.expires_at ? toLocalDatetimeInput(new Date(item.expires_at)) : '';
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingId.set(null);
  }

  save(): void {
    const title = this.formTitle.trim();
    const body = this.formBody.trim();
    if (!title || !body) {
      this.error.set('Título y contenido son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payloadBase = {
      title,
      body,
      active: this.formActive,
      requires_ack: this.formRequiresAck,
      published_at: this.formPublishedAt ? toIsoOrEmpty(this.formPublishedAt) : undefined,
      expires_at: this.formExpiresAt ? toIsoOrEmpty(this.formExpiresAt) : undefined
    };

    const editId = this.editingId();
    if (editId == null) {
      const payload: PedagogicalNoticeCreateDTO = payloadBase;
      this.noticeService.create(payload).subscribe({
        next: () => this.onSaved(),
        error: (err: unknown) => this.onSaveError(err)
      });
      return;
    }

    const payload: PedagogicalNoticeUpdateDTO = payloadBase;
    this.noticeService.update(editId, payload).subscribe({
      next: () => this.onSaved(),
      error: (err: unknown) => this.onSaveError(err)
    });
  }

  delete(item: PedagogicalNotice): void {
    if (!confirm(`¿Eliminar aviso "${item.title}"?`)) return;
    this.loading.set(true);
    this.error.set(null);
    this.noticeService.delete(item.id).subscribe({
      next: () => this.loadNotices(),
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  }

  private onSaved(): void {
    this.saving.set(false);
    this.closeModal();
    this.loadNotices();
  }

  private onSaveError(err: unknown): void {
    this.saving.set(false);
    this.error.set(this.getErrorMessage(err));
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para gestionar avisos.';
      if (err.status === 400) return 'Datos inválidos en el aviso.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      return `Error del servidor (${err.status}).`;
    }
    return 'No se pudo completar la operación.';
  }
}

function toLocalDatetimeInput(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toIsoOrEmpty(localInput: string): string {
  const d = new Date(localInput);
  return Number.isNaN(d.getTime()) ? localInput : d.toISOString();
}
