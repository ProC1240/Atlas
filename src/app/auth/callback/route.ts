import { cookies } from 'next/headers';
import { authDestination, readOAuthTransaction } from '@/lib/oauth';
import {
  apiHandler,
  applicationOrigin,
  authProviders,
  cookiePrefix,
  privateCookie,
  serverClient,
  verifiedUser,
} from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return apiHandler(async () => {
    const url = new URL(request.url);
    const jar = await cookies();
    const transaction = readOAuthTransaction(
      jar.get(`${cookiePrefix}-oauth`)?.value,
      url.searchParams.get('state'),
    );
    const target = new URL(authDestination(transaction?.next), applicationOrigin(request));
    target.searchParams.set('auth', 'failed');
    if (transaction) {
      jar.set(`${cookiePrefix}-oauth`, '', { ...privateCookie, maxAge: 0 });
      const code = url.searchParams.get('code');
      if (authProviders().google && code && code.length <= 2048 && !url.searchParams.has('error')) {
        try {
          const db = await serverClient();
          // A delayed callback must never replace a session established in another tab.
          if (!(await verifiedUser(db))) {
            const flowId = url.searchParams.get('sb_flow_id');
            const { data, error } = await db.auth.exchangeCodeForSession(
              code,
              flowId ? { flowId } : undefined,
            );
            if (!error && data.user && data.session) target.searchParams.set('auth', 'success');
          }
        } catch {}
      }
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location: target.href,
        'Cache-Control': 'private, no-store, max-age=0',
        'Referrer-Policy': 'no-referrer',
        Vary: 'Cookie',
      },
    });
  });
}
