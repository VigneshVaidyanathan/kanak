import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(config: RateLimitConfig) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (req: NextRequest, ...args: any[]) {
      const clientIp =
        req.ip || req.headers.get('x-forwarded-for') || 'unknown';
      const key = `${clientIp}:${propertyName}`;

      const now = Date.now();
      const record = rateLimitMap.get(key);

      if (!record || now > record.resetTime) {
        rateLimitMap.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
        return method.apply(this, [req, ...args]);
      }

      if (record.count >= config.maxRequests) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': record.resetTime.toString(),
            },
          }
        );
      }

      record.count++;

      const response = await method.apply(this, [req, ...args]);

      if (response.headers) {
        response.headers.set(
          'X-RateLimit-Limit',
          config.maxRequests.toString()
        );
        response.headers.set(
          'X-RateLimit-Remaining',
          (config.maxRequests - record.count).toString()
        );
        response.headers.set('X-RateLimit-Reset', record.resetTime.toString());
      }

      return response;
    };

    return descriptor;
  };
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: NextRequest, next: () => Promise<NextResponse>) => {
    const clientIp = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const key = `global:${clientIp}`;

    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return next();
    }

    if (record.count >= config.maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetTime.toString(),
          },
        }
      );
    }

    record.count++;

    const response = await next();

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set(
      'X-RateLimit-Remaining',
      (config.maxRequests - record.count).toString()
    );
    response.headers.set('X-RateLimit-Reset', record.resetTime.toString());

    return response;
  };
}
