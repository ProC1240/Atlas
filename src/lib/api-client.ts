export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let queue: Promise<unknown> = Promise.resolve();
export function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; userId?: string } = {},
): Promise<T> {
  const run = async () => {
    const response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Atlas-Request': '1',
        ...(options.userId ? { 'X-Atlas-User': options.userId } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) throw new RequestError(response.status, data.error ?? 'Request failed.');
    return data as T;
  };
  const task = queue.then(async () =>
    typeof navigator !== 'undefined' && navigator.locks
      ? await navigator.locks.request('atlas-session-request', run)
      : await run(),
  );
  queue = task.catch(() => undefined);
  return task;
}
export interface AuthStatus {
  configured: boolean;
  providers: { google: boolean; email: boolean };
  user: { id: string; email: string | null } | null;
}
