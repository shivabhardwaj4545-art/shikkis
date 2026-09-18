import type { NextFunction, Request, Response } from 'express';

// ─── Custom App Error ─────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ─── Centralized Error Handler ────────────────────────────────────────────────

/**
 * Express 4-argument error handler — must be registered LAST in the middleware chain.
 *
 * All errors are returned in the standard envelope:
 *   { error: { code, message, details? } }
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Log unexpected errors server-side but never leak stack traces to clients
  console.error('Unhandled error:', err);

  const status = (err as { status?: number; statusCode?: number })?.status ?? 500;
  const message =
    process.env.NODE_ENV === 'development'
      ? String((err as Error)?.message ?? 'Internal server error')
      : 'Internal server error';

  res.status(status).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}
