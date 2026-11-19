import type {Fields, RecordRow} from './model';
import type {PublicReports} from './public-reports';

export type Draft = {fields: Fields; revision: number; updatedAt: string};
export type Snapshot = {drafts: Record<string, Draft>; records: RecordRow[];recordsAccessible:boolean;publicReports?:PublicReports};
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function cemeteryApi<T>(body?: unknown, signal?: AbortSignal,query=''): Promise<T> {
  const response = await fetch('/api/cemetery'+(body===undefined&&query?'?'+query:''), {
    method: body === undefined ? 'GET' : 'POST',
    cache: 'no-store', signal,
    ...(body === undefined ? {} : {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}),
  });
  let data: any;
  try { data = await response.json(); }
  catch { throw new ApiError('The connection was interrupted. Your input is still here. Try again.', response.status); }
  if (!response.ok) throw new ApiError(data.error || 'Unable to save. Please try again.', response.status);
  return data as T;
}
