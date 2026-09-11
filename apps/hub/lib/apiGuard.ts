import { z } from "zod";
import { checkRateLimit, getClientIp } from "./rateLimiter";

export interface ApiGuardConfig<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny
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
}

export interface ApiGuardContext<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny
> {
  request: Request;
  query: z.infer<TQuery>;
  body: z.infer<TBody>;
  clientIp: string;
}

/**
 * Higher-order function that wraps Next.js App Router API route handlers
 * with systematic perimeter defenses:
 * 1. IP extraction & sliding-window rate limiting.
 * 2. Zod query and body schema validation.
 * 3. Security response headers (X-Content-Type-Options, RateLimit headers).
 * 4. Structured error responses (400 for bad input, 429 for rate limit, 500 for unexpected errors).
 */
export function withApiGuard<
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny
>(
  config: ApiGuardConfig<TQuery, TBody>,
  handler: (ctx: ApiGuardContext<TQuery, TBody>) => Promise<Response> | Response
) {
  return async function guardedHandler(request: Request): Promise<Response> {
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

    if (!rateResult.success) {
      return Response.json(
        {
          error: "Too many requests. Please slow down and try again later.",
          retryAfterSeconds: rateResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetInSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateResult.resetInSeconds),
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    // 2. Query Schema Validation (if configured)
    let parsedQuery = undefined as z.infer<TQuery>;
    if (config.querySchema) {
      try {
        const url = new URL(request.url);
        const queryObj: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          queryObj[key] = val;
        });

        const queryParsed = config.querySchema.safeParse(queryObj);
        if (!queryParsed.success) {
          const firstIssue = queryParsed.error.issues[0]?.message || "Invalid query parameters";
          return Response.json(
            {
              error: firstIssue,
              details: queryParsed.error.format(),
            },
            {
              status: 400,
              headers: {
                "X-Content-Type-Options": "nosniff",
              },
            }
          );
        }
        parsedQuery = queryParsed.data;
      } catch {
        return Response.json(
          { error: "Malformed URL or query parameters." },
          { status: 400, headers: { "X-Content-Type-Options": "nosniff" } }
        );
      }
    }

    // 3. Body Schema Validation (if configured)
    let parsedBody = undefined as z.infer<TBody>;
    if (config.bodySchema) {
      let bodyJson: unknown;
      try {
        bodyJson = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid or malformed JSON payload in request body." },
          { status: 400, headers: { "X-Content-Type-Options": "nosniff" } }
        );
      }

      const bodyParsed = config.bodySchema.safeParse(bodyJson);
      if (!bodyParsed.success) {
        const firstIssue = bodyParsed.error.issues[0]?.message || "Validation failed for request body";
        return Response.json(
          {
            error: firstIssue,
            details: bodyParsed.error.format(),
          },
          {
            status: 400,
            headers: {
              "X-Content-Type-Options": "nosniff",
            },
          }
        );
      }
      parsedBody = bodyParsed.data;
    }

    // 4. Delegate to the protected route handler
    try {
      const response = await handler({
        request,
        query: parsedQuery,
        body: parsedBody,
        clientIp,
      });

      // Inject standard defensive security & rate limit headers into successful response
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-RateLimit-Limit", String(rateResult.limit));
      response.headers.set("X-RateLimit-Remaining", String(rateResult.remaining));
      return response;
    } catch (err: unknown) {
      console.error("[API_GUARD_UNCAUGHT_ERROR]", err);
      return Response.json(
        { error: "Internal Server Error occurred while processing request." },
        {
          status: 500,
          headers: {
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }
  };
}
