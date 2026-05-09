import { Injectable } from '@angular/core';
import { BillingRecord, BillingStatus, PaymentMethod, BillingSummary } from './models/billing.models';

interface BillingUpsertInput {
  patient_name: string;
  concept: string;
  amount: number;
  due_date: string;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly storageKey = 'dentify_billing_records_v1';

  list(): BillingRecord[] {
    const rows = this.read();
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  summary(records: BillingRecord[]): BillingSummary {
    const total = records.length;
    const pending = records.filter((r) => r.status === 'pendiente').length;
    const paid = records.filter((r) => r.status === 'pagado').length;
    const annulled = records.filter((r) => r.status === 'anulado').length;
    const pendingAmount = records
      .filter((r) => r.status === 'pendiente')
      .reduce((acc, r) => acc + r.amount, 0);
    const paidAmount = records.filter((r) => r.status === 'pagado').reduce((acc, r) => acc + r.amount, 0);
    return { total, pending, paid, annulled, pendingAmount, paidAmount };
  }

  create(input: BillingUpsertInput): BillingRecord {
    const all = this.read();
    const now = new Date().toISOString();
    const row: BillingRecord = {
      id: crypto.randomUUID(),
      patient_name: input.patient_name.trim(),
      concept: input.concept.trim(),
      amount: round2(input.amount),
      due_date: input.due_date,
      status: 'pendiente',
      notes: cleanNullable(input.notes),
      payment_method: null,
      paid_at: null,
      annul_reason: null,
      created_at: now,
      updated_at: now
    };
    all.push(row);
    this.write(all);
    return row;
  }

  update(id: string, input: BillingUpsertInput): BillingRecord | null {
    const all = this.read();
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    if (all[idx].status !== 'pendiente') return null;
    all[idx] = {
      ...all[idx],
      patient_name: input.patient_name.trim(),
      concept: input.concept.trim(),
      amount: round2(input.amount),
      due_date: input.due_date,
      notes: cleanNullable(input.notes),
      updated_at: new Date().toISOString()
    };
    this.write(all);
    return all[idx];
  }

  markAsPaid(id: string, method: PaymentMethod, paidAt: string, notes?: string | null): BillingRecord | null {
    const all = this.read();
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    if (all[idx].status !== 'pendiente') return null;
    all[idx] = {
      ...all[idx],
      status: 'pagado',
      payment_method: method,
      paid_at: paidAt,
      notes: cleanNullable(notes) ?? all[idx].notes ?? null,
      updated_at: new Date().toISOString()
    };
    this.write(all);
    return all[idx];
  }

  annul(id: string, reason: string): BillingRecord | null {
    const all = this.read();
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    if (all[idx].status === 'anulado') return null;
    all[idx] = {
      ...all[idx],
      status: 'anulado',
      annul_reason: reason.trim(),
      updated_at: new Date().toISOString()
    };
    this.write(all);
    return all[idx];
  }

  private read(): BillingRecord[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      const seeded = this.seed();
      this.write(seeded);
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw) as BillingRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(items: BillingRecord[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private seed(): BillingRecord[] {
    const now = new Date();
    const iso = now.toISOString();
    return [
      {
        id: crypto.randomUUID(),
        patient_name: 'Marta López',
        concept: 'Limpieza dental',
        amount: 55,
        due_date: toDateISO(now),
        status: 'pendiente',
        payment_method: null,
        paid_at: null,
        notes: 'Pendiente de cobro en caja',
        annul_reason: null,
        created_at: iso,
        updated_at: iso
      },
      {
        id: crypto.randomUUID(),
        patient_name: 'Carlos Ruiz',
        concept: 'Empaste compuesto',
        amount: 90,
        due_date: toDateISO(now),
        status: 'pagado',
        payment_method: 'tarjeta',
        paid_at: toDateISO(now),
        notes: null,
        annul_reason: null,
        created_at: iso,
        updated_at: iso
      }
    ];
  }
}

function cleanNullable(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed.length ? trimmed : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

