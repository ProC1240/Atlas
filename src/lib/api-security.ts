export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertSameOrigin(request: Request, configuredOrigin?: string, production = false) {
  const url = new URL(request.url);
  if (production && !configuredOrigin)
    throw new ApiError(503, 'Application origin is not configured.');
  const expected = configuredOrigin ? new URL(configuredOrigin).origin : url.origin;
  if (
    request.headers.get('origin') !== expected ||
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    request.headers.get('x-atlas-request') !== '1'
  )
    throw new ApiError(403, 'Request origin is not allowed.');
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new ApiError(415, 'Use application/json.');
}

export async function readJson(request: Request, limit = 4096): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, 'Request is too large.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Invalid JSON.');
  } finally {
    reader.releaseLock();
  }
}

export function createRateLimiter() {
  const entries = new Map<string, { count: number; until: number }>();
  return (key: string, limit: number, windowMs: number, now = Date.now()) => {
    for (const [id, entry] of entries) if (entry.until <= now) entries.delete(id);
    const entry = entries.get(key);
    if (entry && entry.count >= limit)
      throw new ApiError(429, 'Too many attempts. Please wait and try again.');
    if (!entry && entries.size >= 10000) throw new ApiError(429, 'Please try again later.');
    entries.set(key, { count: (entry?.count ?? 0) + 1, until: entry?.until ?? now + windowMs });
  };
}
