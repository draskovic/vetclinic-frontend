import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Cross-tab query sinhronizacija preko BroadcastChannel API-ja.
 *
 * Kako radi:
 * - Svaki tab otvori isti imenovani kanal ('vetclinic-query-sync')
 * - Kad mutation uspe, `invalidateAndBroadcast()` invalidira lokalno
 *   i pošalje poruku ostalim tabovima preko kanala
 * - Ostali tabovi primaju poruku i invalidiraju iste query ključeve
 * - Echo prevention je strukturan: primalac samo invalidira, nikad ne re-broadcastuje
 *   (BroadcastChannel uostalom ne emituje poruku pošiljaocu)
 *
 * Fallback: Ako browser ne podržava BroadcastChannel (stari Safari < 15.4),
 * invalidAndBroadcast radi samo lokalno — nema crash-a, samo nema cross-tab sync-a.
 */

const CHANNEL_NAME = 'vetclinic-query-sync';

let channel: BroadcastChannel | null = null;

interface BroadcastMessage {
  type: 'invalidate';
  queryKeys: QueryKey[];
}

/**
 * Inicijalizuje BroadcastChannel i postavlja listener za dolazne invalidacije.
 * Pozvati jednom pri startu aplikacije (u App.tsx pre QueryClientProvider).
 */
export function initQueryBroadcast(queryClient: QueryClient): void {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn(
      '[queryBroadcast] BroadcastChannel nije podržan u ovom browseru — cross-tab sync isključen',
    );
    return;
  }

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (err) {
    console.warn('[queryBroadcast] Neuspešna inicijalizacija BroadcastChannel:', err);
    return;
  }

  channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
    const data = event.data;
    if (!data || data.type !== 'invalidate' || !Array.isArray(data.queryKeys)) {
      return;
    }

    // Samo lokalna invalidacija — NE re-broadcastujemo (tako izbegavamo petlju)
    data.queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };
}

/**
 * Invalidira query ključeve lokalno i šalje poruku ostalim tabovima
 * da urade isto. Koristi se umesto direktnog `queryClient.invalidateQueries`
 * kad god je potrebno da promene budu vidljive i u drugim otvorenim tabovima.
 *
 * Primer:
 *   invalidateAndBroadcast(queryClient, [
 *     ['inventory-items'],
 *     ['inventory-item'],
 *     ['inventory-batches'],
 *   ]);
 */
export function invalidateAndBroadcast(queryClient: QueryClient, queryKeys: QueryKey[]): void {
  // Lokalna invalidacija — uvek radi
  queryKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });

  // Propagacija ka drugim tabovima
  if (!channel) return;

  try {
    const message: BroadcastMessage = { type: 'invalidate', queryKeys };
    channel.postMessage(message);
  } catch (err) {
    console.warn('[queryBroadcast] Neuspešno slanje poruke:', err);
  }
}

/**
 * Zatvara kanal — korisno u testovima ili pri unmount-u aplikacije.
 */
export function closeQueryBroadcast(): void {
  channel?.close();
  channel = null;
}
