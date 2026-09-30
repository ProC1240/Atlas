import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import { ApiError, assertSameOrigin, createRateLimiter } from '../api-security';

const rateLimit = createRateLimiter();
export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}
export async function serverClient() {
  if (!authConfigured()) throw new ApiError(503, 'Cloud sign-in is not configured.');
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: {
      name: secure ? '__Host-atlas-session' : 'atlas-session',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) jar.set(name, value, options);
      },
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
    },
  });
}
export async function verifiedUser(db: Awaited<ReturnType<typeof serverClient>>) {
  const { data, error } = await db.auth.getUser();
  if (error) {
    if (error.name === 'AuthSessionMissingError' || [400, 401, 403].includes(error.status ?? 0))
      return null;
    throw new ApiError(503, 'Sign-in service is unavailable. Please try again.');
  }
  return data.user;
}
export async function requireUser(db: Awaited<ReturnType<typeof serverClient>>, request?: Request) {
  const user = await verifiedUser(db);
  if (!user) throw new ApiError(401, 'Your session ended. Sign in again to save.');
  if (request && request.headers.get('x-atlas-user') !== user.id)
    throw new ApiError(409, 'The account changed in another tab. Reload before saving.');
  return user;
}
export function protectMutation(request: Request) {
  assertSameOrigin(request, process.env.APP_ORIGIN, process.env.NODE_ENV === 'production');
}
export function throttleAuth(kind: string, email: string) {
  const hash = createHash('sha256').update(email.toLowerCase()).digest('hex');
  rateLimit(`global:${kind}`, 60, 60000);
  rateLimit(`${kind}:${hash}`, kind === 'otp' ? 3 : 10, 10 * 60000);
}
export function apiResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function apiHandler(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) return apiResponse({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return apiResponse({ error: 'Check the submitted fields.' }, 400);
    return apiResponse({ error: 'Service unavailable. Please try again.' }, 503);
  }
}
