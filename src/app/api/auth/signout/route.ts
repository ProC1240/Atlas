import { ApiError } from '@/lib/api-security';
import { apiHandler, apiResponse, protectMutation, serverClient } from '@/lib/server/auth';
export async function POST(request: Request) {
  return apiHandler(async () => {
    protectMutation(request);
    const { error } = await (await serverClient()).auth.signOut({ scope: 'local' });
    if (error) throw new ApiError(503, 'Could not sign out. Please try again.');
    return apiResponse({ signedOut: true });
  });
}
