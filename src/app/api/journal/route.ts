import { z } from 'zod';
import { emptyData, parseData } from '@/domain/training';
import { ApiError, readJson } from '@/lib/api-security';
import {
  apiHandler,
  apiResponse,
  protectMutation,
  requireUser,
  serverClient,
} from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return apiHandler(async () => {
    const db = await serverClient(),
      user = await requireUser(db, request);
    const { data, error } = await db
      .from('training_states')
      .select('payload,revision')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new ApiError(503, 'Cloud journal is unavailable. Try again.');
    return apiResponse({
      data: data ? parseData(data.payload) : structuredClone(emptyData),
      revision: data?.revision ?? 0,
    });
  });
}
const schema = z.object({ data: z.unknown(), revision: z.number().int().nonnegative() }).strict();
export async function PUT(request: Request) {
  return apiHandler(async () => {
    protectMutation(request);
    const db = await serverClient();
    await requireUser(db, request);
    const input = schema.parse(await readJson(request, 2_000_000));
    const payload = parseData(input.data);
    const { data: revision, error } = await db.rpc('save_training_state', {
      p_payload: payload,
      p_revision: input.revision,
    });
    if (error) {
      if (error.message.includes('revision conflict'))
        throw new ApiError(
          409,
          'Another session updated your journal. Export a backup, then reload.',
        );
      throw new ApiError(503, 'Cloud save failed. Export a backup before closing this tab.');
    }
    return apiResponse({ revision });
  });
}
