export type BillingStatus = 'pendiente' | 'pagado' | 'anulado';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'bizum';

export interface BillingRecord {
  id: string;
  patient_name: string;
  concept: string;
  amount: number;
  due_date: string;
  status: BillingStatus;
  payment_method?: PaymentMethod | null;
  paid_at?: string | null;
  notes?: string | null;
  annul_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingSummary {
  total: number;
  pending: number;
  paid: number;
  annulled: number;
  pendingAmount: number;
  paidAmount: number;
}

