export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization"
    }
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw new HttpError(400, `Missing required field: ${field}`);
    }
  }
}

export function requireAdmin(request: Request, token?: string): void {
  if (!token) return;

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${token}`) {
    throw new HttpError(401, "Unauthorized");
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json(
      {
        success: false,
        message: error.message,
        details: error.details
      },
      error.status
    );
  }

  return json(
    {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    },
    500
  );
}
