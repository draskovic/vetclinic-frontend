import { AxiosError } from 'axios';

/**
 * Tipizovano čitanje grešaka iz API poziva — zamena za `catch (e: any)` / `onError: (err: any)`.
 *
 * Backend `GlobalExceptionHandler` vraća `{ status, message, fieldErrors? }`,
 * pa helperi ciljaju taj oblik. Sve je `unknown`-safe: nepoznat oblik greške
 * (mrežni prekid, string, null) pada na fallback umesto da pukne.
 */
interface ApiErrorBody {
  status?: number;
  message?: string;
}

function asAxiosError(e: unknown): AxiosError<ApiErrorBody> | null {
  // instanceof je pouzdan jer je axios jedina instanca u bundle-u (nema dupli paket)
  return e instanceof AxiosError ? (e as AxiosError<ApiErrorBody>) : null;
}

/** HTTP status greške (409, 403, ...) ili `undefined` ako nije HTTP greška. */
export function getApiErrorStatus(e: unknown): number | undefined {
  return asAxiosError(e)?.response?.status;
}

/** Poruka koju je backend poslao, ili `fallback` ako je nema. */
export function getApiErrorMessage(e: unknown, fallback: string): string {
  const body = asAxiosError(e)?.response?.data;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  return message.length > 0 ? message : fallback;
}
