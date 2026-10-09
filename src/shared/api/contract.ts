export interface Webhook {
  id: number;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookList {
  data: Webhook[];
  paging: {
    pages: {
      current: number;
      last: number;
    };
    results: {
      total: number;
      limitation: number;
    };
  };
}

export interface Me {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

export interface ApiErrorBody {
  error: {
    type: string;
    message: string;
    payload?: Record<string, string[]>;
  };
}

export interface WebhookListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface WebhookUpdateInput {
  name: string;
  url: string;
}
