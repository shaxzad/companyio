import type { FastifyReply } from 'fastify';
import type { ZodError } from 'zod';

/**
 * Canonical API error body for fuel / auth JSON routes.
 * - `message`: always present (human-readable, safe for toast / summary)
 * - `fields`: optional map of form field → message (for inline input errors)
 * - `code`: optional machine-readable code (e.g. CONFLICT)
 */
export type ApiErrorBody = {
  message: string;
  fields?: Record<string, string>;
  code?: string;
};

export const apiError = (
  message: string,
  options?: { fields?: Record<string, string>; code?: string }
): ApiErrorBody => ({
  message,
  ...(options?.fields && Object.keys(options.fields).length > 0 ? { fields: options.fields } : {}),
  ...(options?.code ? { code: options.code } : {}),
});

/** Flatten Zod issues into top-level message + per-field map. */
export const fromZodError = (error: ZodError): ApiErrorBody => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'input';
    if (fields[key]) continue;
    fields[key] =
      issue.message === 'Required' ? `${key} is required.` : issue.message || 'Invalid value.';
  }
  const firstKey = Object.keys(fields)[0];
  const message = firstKey && fields[firstKey] ? fields[firstKey] : 'Invalid input.';
  return apiError(message, {
    fields: Object.keys(fields).length > 0 ? fields : undefined,
    code: 'VALIDATION_ERROR',
  });
};

export const sendApiError = (
  reply: FastifyReply,
  statusCode: number,
  message: string,
  options?: { fields?: Record<string, string>; code?: string }
) => reply.code(statusCode).send(apiError(message, options));
