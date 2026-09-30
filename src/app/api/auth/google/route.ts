import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ApiError, readJson } from '@/lib/api-security';
import { authDestination, oauthLifetime } from '@/lib/oauth';
import {
  apiHandler,
  apiResponse,
  applicationOrigin,
  authProviders,
  cookiePrefix,
  privateCookie,
  protectMutation,
  serverClient,
  throttleAuth,
  verifiedUser,
} from '@/lib/server/auth';

export async function POST(request: Request) {
  return apiHandler(async () => {
    protectMutation(request);
    if (!authProviders().google) throw new ApiError(503, 'Google sign-in is unavailable.');
    const input = z
      .object({ next: z.string().max(100).optional() })
      .strict()
      .parse(await readJson(request));
    throttleAuth('google', 'google');
    const db = await serverClient();
    if (await verifiedUser(db)) throw new ApiError(409, 'Sign out before changing accounts.');
    const state = randomBytes(32).toString('hex');
    const callback = new URL('/auth/callback', applicationOrigin(request));
    callback.searchParams.set('state', state);
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.href,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error || !data.url) throw new ApiError(503, 'Unable to start Google sign-in. Try again.');
    (await cookies()).set(
      `${cookiePrefix}-oauth`,
      JSON.stringify({
        state,
        next: authDestination(input.next),
        expires: Date.now() + oauthLifetime * 1000,
      }),
      { ...privateCookie, maxAge: oauthLifetime },
    );
    return apiResponse({ url: data.url });
  });
}
