import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema, 'body'), handler)
 *   router.get('/products', validate(productQuerySchema, 'query'), handler)
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Replace req[source] with the coerced/parsed result so downstream
      // handlers always receive validated data in the correct shape.
      req[source] = schema.parse(req[source]) as typeof req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: err.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}
