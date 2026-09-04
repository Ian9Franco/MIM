import { z } from "zod";
import { checkRateLimit, getClientIp } from "./rateLimiter";

export interface ApiGuardConfig<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny
> {
  /**
   * Rate limiting rules per client IP.
   * Default: 60 requests per minute.
   */
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
    customIdentifier?: (req: Request) => string;
  };
  /**
   * Zod schema to validate and parse URL search params / query strings.
   */
  querySchema?: TQuery;
  /**
   * Zod schema to validate and parse JSON request body payloads.
   */
  bodySchema?: TBody;
  /**
   * Zod schema to validate and parse dynamic route params (e.g. [slug]).
   */
  paramsSchema?: TParams;
}

export interface ApiGuardContext<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny
> {
  request: Request;
  query: z.infer<TQuery>;
  body: z.infer<TBody>;
  params: z.infer<TParams>;
  clientIp: string;
}

export interface RouteContext {
  params?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Higher-order function that wraps Next.js App Router API route handlers
 * with systematic perimeter defenses:
 * 1. IP extraction & sliding-window rate limiting.
 * 2. Zod query, body, and route params schema validation.
 * 3. Security response headers (X-Content-Type-Options, RateLimit headers).
 * 4. Structured error responses (400 for bad input, 429 for rate limit, 500 for unexpected errors).
 */
export function withApiGuard<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny
>(
  config: ApiGuardConfig<TQuery, TBody, TParams>,
  handler: (ctx: ApiGuardContext<TQuery, TBody, TParams>) => Promise<Response> | Response
) {
  return async function guardedHandler(
    request: Request,
    context?: RouteContext
  ): Promise<Response> {
    const clientIp = getClientIp(request);

    // 1. Enforce Rate Limiting
    const rateLimitOpts = {
      windowMs: config.rateLimit?.windowMs ?? 60 * 1000,
      maxRequests: config.rateLimit?.maxRequests ?? 60,
    };

    const identifier = config.rateLimit?.customIdentifier
      ? config.rateLimit.customIdentifier(request)
      : clientIp;

    const rateResult = checkRateLimit(identifier, rateLimitOpts);

    const baseHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-RateLimit-Limit": rateResult.limit.toString(),
      "X-RateLimit-Remaining": rateResult.remaining.toString(),
      "X-RateLimit-Reset": rateResult.resetInSeconds.toString(),
    };

    if (!rateResult.success) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: "Demasiadas peticiones. Por favor aguarde unos segundos antes de reintentar.",
          retryAfter: rateResult.resetInSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": rateResult.resetInSeconds.toString(),
            ...baseHeaders,
          },
        }
      );
    }

    // 2. Validate Dynamic Route Params (if paramsSchema is configured)
    let parsedParams: any = {};
    if (context?.params) {
      const rawParams = context.params instanceof Promise ? await context.params : context.params;
      if (config.paramsSchema) {
        const paramsValidation = config.paramsSchema.safeParse(rawParams);
        if (!paramsValidation.success) {
          return new Response(
            JSON.stringify({
              error: "INVALID_ROUTE_PARAMS",
              details: paramsValidation.error.flatten(),
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...baseHeaders,
              },
            }
          );
        }
        parsedParams = paramsValidation.data;
      } else {
        parsedParams = rawParams;
      }
    }

    // 3. Validate Query Parameters (if querySchema is configured)
    let parsedQuery: any = {};
    if (config.querySchema) {
      try {
        const url = new URL(request.url);
        const rawQuery: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          rawQuery[key] = val;
        });

        const queryValidation = config.querySchema.safeParse(rawQuery);
        if (!queryValidation.success) {
          return new Response(
            JSON.stringify({
              error: "INVALID_QUERY_PARAMETERS",
              details: queryValidation.error.flatten(),
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...baseHeaders,
              },
            }
          );
        }
        parsedQuery = queryValidation.data;
      } catch {
        return new Response(
          JSON.stringify({
            error: "MALFORMED_URL",
            message: "No se pudo interpretar la URL de la petición.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...baseHeaders,
            },
          }
        );
      }
    }

    // 4. Validate Request Body (if bodySchema is configured)
    let parsedBody: any = {};
    if (config.bodySchema) {
      try {
        const rawJson = await request.json();
        const bodyValidation = config.bodySchema.safeParse(rawJson);
        if (!bodyValidation.success) {
          return new Response(
            JSON.stringify({
              error: "INVALID_REQUEST_BODY",
              details: bodyValidation.error.flatten(),
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...baseHeaders,
              },
            }
          );
        }
        parsedBody = bodyValidation.data;
      } catch {
        return new Response(
          JSON.stringify({
            error: "MALFORMED_JSON_BODY",
            message: "El cuerpo de la petición no contiene un JSON válido.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...baseHeaders,
            },
          }
        );
      }
    }

    // 5. Dispatch to guarded route handler
    try {
      const response = await handler({
        request,
        query: parsedQuery,
        body: parsedBody,
        params: parsedParams,
        clientIp,
      });

      // Inject security headers into successful responses
      const responseHeaders = new Headers(response.headers);
      Object.entries(baseHeaders).forEach(([k, v]) => {
        if (!responseHeaders.has(k)) {
          responseHeaders.set(k, v);
        }
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      console.error(`[ApiGuard] Error procesando ruta ${request.url}:`, err);
      return new Response(
        JSON.stringify({
          error: "INTERNAL_SERVER_ERROR",
          message: "Ocurrió un error inesperado al procesar la petición.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...baseHeaders,
          },
        }
      );
    }
  };
}
