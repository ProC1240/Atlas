import {
  apiHandler,
  apiResponse,
  authConfigured,
  serverClient,
  verifiedUser,
} from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  return apiHandler(async () => {
    if (!authConfigured()) return apiResponse({ configured: false, user: null });
    const user = await verifiedUser(await serverClient());
    return apiResponse({
      configured: true,
      user: user ? { id: user.id, email: user.email ?? null } : null,
    });
  });
}
