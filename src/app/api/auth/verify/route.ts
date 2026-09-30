import { z } from 'zod';
import { ApiError, readJson } from '@/lib/api-security';
import {
  apiHandler,
  apiResponse,
  authProviders,
  protectMutation,
  serverClient,
  throttleAuth,
  verifiedUser,
} from '@/lib/server/auth';
const schema = z
  .object({ email: z.string().trim().email().max(254), token: z.string().regex(/^\d{6,10}$/) })
  .strict();
export async function POST(request: Request) {
  return apiHandler(async () => {
    protectMutation(request);
    if (!authProviders().email) throw new ApiError(503, 'Email sign-in is unavailable.');
    const { email, token } = schema.parse(await readJson(request));
    throttleAuth('verify', email);
    const db = await serverClient();
    if (await verifiedUser(db)) throw new ApiError(409, 'Sign out before changing accounts.');
    const { data, error } = await db.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.user || !data.session)
      throw new ApiError(
        error?.status === 429 ? 429 : 400,
        'Code is invalid or expired. Request a new code.',
      );
    return apiResponse({ user: { id: data.user.id, email: data.user.email ?? null } });
  });
}
