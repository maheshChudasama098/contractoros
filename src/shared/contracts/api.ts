// API envelope shared by server (producer) and web (consumer). Spec §10.
export type ApiError = {
  error: {
    code: string;
    message: string;
    field_errors?: Record<string, string[]>;
    request_id: string;
  };
};

export type ApiData<T> = { data: T };

export type Paginated<T> = { items: T[]; page: number; per_page: number; total: number };
