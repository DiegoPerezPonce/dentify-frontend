export interface PedagogicalNotice {
  type?: 'pedagogical_notice';
  id: number;
  title: string;
  body: string;
  active: boolean;
  published_at?: string;
  expires_at?: string | null;
  requires_ack?: boolean;
  created_at?: string;
  updated_at?: string | null;
  created_by_id?: number | null;
}

export interface PedagogicalNoticeListResult {
  items: PedagogicalNotice[];
  total: number;
}

export interface PedagogicalNoticeCreateDTO {
  title: string;
  body: string;
  active?: boolean;
  published_at?: string;
  expires_at?: string;
  requires_ack?: boolean;
}

export interface PedagogicalNoticeUpdateDTO {
  title?: string;
  body?: string;
  active?: boolean;
  published_at?: string;
  expires_at?: string;
  requires_ack?: boolean;
}
