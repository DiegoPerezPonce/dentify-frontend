import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { ROLE_ADMIN } from '../../../core/utils/jwt-roles';
import { BillingService } from '../billing.service';
import { BillingRecord, BillingStatus, PaymentMethod } from '../models/billing.models';

@Component({
  selector: 'app-billing-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './billing-payments.html',
  styleUrl: './billing-payments.scss'
})
export class BillingPaymentsComponent {
  private fb = inject(FormBuilder);
  private billingService = inject(BillingService);
  private auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.hasRole(ROLE_ADMIN));
  readonly records = signal<BillingRecord[]>([]);
  readonly filterStatus = signal<'all' | BillingStatus>('all');
  readonly search = signal('');
  readonly error = signal<string | null>(null);

  readonly showEditModal = signal(false);
  readonly editing = signal<BillingRecord | null>(null);
  readonly showPayModal = signal(false);
  readonly paying = signal<BillingRecord | null>(null);
  readonly showAnnulModal = signal(false);
  readonly annulling = signal<BillingRecord | null>(null);

  readonly editForm = this.fb.group({
    patient_name: ['', [Validators.required, Validators.maxLength(120)]],
    concept: ['', [Validators.required, Validators.maxLength(180)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    due_date: ['', [Validators.required]],
    notes: ['']
  });

  readonly payForm = this.fb.group({
    payment_method: ['tarjeta' as PaymentMethod, [Validators.required]],
    paid_at: [todayISO(), [Validators.required]],
    notes: ['']
  });

  readonly annulForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(220)]]
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.filterStatus();
    return this.records().filter((r) => {
      const matchesStatus = status === 'all' ? true : r.status === status;
      if (!matchesStatus) return false;
      if (!term) return true;
      const blob = `${r.patient_name} ${r.concept} ${r.notes ?? ''}`.toLowerCase();
      return blob.includes(term);
    });
  });

  readonly summary = computed(() => this.billingService.summary(this.filtered()));

  constructor() {
    this.reload();
  }

  setStatusFilter(status: 'all' | BillingStatus): void {
    this.filterStatus.set(status);
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  reload(): void {
    this.records.set(this.billingService.list());
  }

  openCreate(): void {
    this.error.set(null);
    this.editing.set(null);
    this.editForm.reset({
      patient_name: '',
      concept: '',
      amount: 0,
      due_date: todayISO(),
      notes: ''
    });
    this.showEditModal.set(true);
  }

  openEdit(record: BillingRecord): void {
    if (record.status !== 'pendiente') return;
    this.error.set(null);
    this.editing.set(record);
    this.editForm.reset({
      patient_name: record.patient_name,
      concept: record.concept,
      amount: record.amount,
      due_date: record.due_date,
      notes: record.notes ?? ''
    });
    this.showEditModal.set(true);
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    const payload = {
      patient_name: String(value.patient_name).trim(),
      concept: String(value.concept).trim(),
      amount: Number(value.amount),
      due_date: String(value.due_date),
      notes: String(value.notes ?? '').trim()
    };
    const current = this.editing();
    const result = current ? this.billingService.update(current.id, payload) : this.billingService.create(payload);
    if (!result) {
      this.error.set('No se pudo guardar el registro. Verifica que siga pendiente.');
      return;
    }
    this.showEditModal.set(false);
    this.reload();
  }

  openPay(record: BillingRecord): void {
    if (record.status !== 'pendiente') return;
    this.error.set(null);
    this.paying.set(record);
    this.payForm.reset({
      payment_method: 'tarjeta',
      paid_at: todayISO(),
      notes: record.notes ?? ''
    });
    this.showPayModal.set(true);
  }

  savePay(): void {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }
    const target = this.paying();
    if (!target) return;
    const value = this.payForm.getRawValue();
    const result = this.billingService.markAsPaid(
      target.id,
      value.payment_method as PaymentMethod,
      String(value.paid_at),
      String(value.notes ?? '')
    );
    if (!result) {
      this.error.set('No se pudo registrar el pago. El estado pudo cambiar.');
      return;
    }
    this.showPayModal.set(false);
    this.reload();
  }

  openAnnul(record: BillingRecord): void {
    if (record.status === 'anulado') return;
    this.error.set(null);
    this.annulling.set(record);
    this.annulForm.reset({ reason: '' });
    this.showAnnulModal.set(true);
  }

  saveAnnul(): void {
    if (this.annulForm.invalid) {
      this.annulForm.markAllAsTouched();
      return;
    }
    const target = this.annulling();
    if (!target) return;
    const reason = String(this.annulForm.getRawValue().reason ?? '').trim();
    const result = this.billingService.annul(target.id, reason);
    if (!result) {
      this.error.set('No se pudo anular el registro.');
      return;
    }
    this.showAnnulModal.set(false);
    this.reload();
  }

  closeAllModals(): void {
    this.showEditModal.set(false);
    this.showPayModal.set(false);
    this.showAnnulModal.set(false);
  }

  statusClass(status: BillingStatus): string {
    return `status-${status}`;
  }

  statusLabel(status: BillingStatus): string {
    if (status === 'pendiente') return 'Pendiente';
    if (status === 'pagado') return 'Pagado';
    return 'Anulado';
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

