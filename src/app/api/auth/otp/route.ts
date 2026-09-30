import { z } from 'zod';
import { ApiError, readJson } from '@/lib/api-security';
import {
  apiHandler,
  apiResponse,
  protectMutation,
  serverClient,
  throttleAuth,
  verifiedUser,
} from '@/lib/server/auth';
const schema = z.object({ email: z.string().trim().email().max(254) }).strict();
export async function POST(request: Request) {
  return apiHandler(async () => {
    protectMutation(request);
    const { email } = schema.parse(await readJson(request));
    throttleAuth('otp', email);
    const db = await serverClient();
    if (await verifiedUser(db)) throw new ApiError(409, 'Sign out before changing accounts.');
    const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error)
      throw new ApiError(
        error.status === 429 ? 429 : 503,
        'Unable to send a code. Please wait and try again.',
      );
    return apiResponse({ sent: true });
  });
}
