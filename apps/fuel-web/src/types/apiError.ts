/**
 * Shared API error contract — mirrors `apps/api/src/http-errors.ts`.
 */
export type ApiErrorBody = {
  message: string;
  fields?: Record<string, string>;
  code?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  readonly code?: string;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || 'The request could not be completed.');
    this.name = 'ApiError';
    this.status = status;
    this.fields = body.fields ?? {};
    this.code = body.code;
    this.body = {
      message: this.message,
      ...(Object.keys(this.fields).length > 0 ? { fields: this.fields } : {}),
      ...(body.code ? { code: body.code } : {}),
    };
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fields).length > 0;
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

export const parseApiErrorBody = (body: unknown): ApiErrorBody => {
  if (!body || typeof body !== 'object') {
    return { message: 'The request could not be completed.' };
  }
  const record = body as Record<string, unknown>;
  const message =
    typeof record.message === 'string' && record.message.trim()
      ? record.message
      : 'The request could not be completed.';

  const fields: Record<string, string> = {};
  if (record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)) {
    for (const [key, value] of Object.entries(record.fields as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) fields[key] = value;
    }
  }

  return {
    message,
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(typeof record.code === 'string' ? { code: record.code } : {}),
  };
};
