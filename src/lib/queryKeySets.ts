/**
 * Centralizovani skupovi query ključeva za invalidaciju.
 *
 * Cilj: kad mutacija utiče na više povezanih entiteta (npr. apply protocol
 * koji menja treatments + faktura + lager), umesto da svaka mutacija ručno
 * lista 10 ključeva, koristi spread sa standardnim set-om.
 *
 * Primer:
 *   invalidateAndBroadcast(queryClient, [
 *     ['treatments', recordId],
 *     ...INVOICE_KEYS,
 *     ...INVENTORY_FULL_KEYS,
 *   ]);
 *
 * Napomena o tipizaciji:
 * - `as const` pravi readonly tuple-ove koje TanStack Query v5 prihvata jer je
 *   `QueryKey = ReadonlyArray<unknown>`.
 * - Trenutni `invalidateAndBroadcast` prima mutable `QueryKey[]`, pa konstante
 *   MORAJU da se prosleđuju kroz spread (`...INVENTORY_FULL_KEYS`) — direktan
 *   prosleđivanje bez spread-a TypeScript odbija (readonly -> mutable).
 *
 * Napomena o prefix match-u (TanStack Query default):
 * - `invalidateQueries({ queryKey: ['inventory-item'] })` invalidira SVE query-je
 *   čiji ključ POČINJE sa `['inventory-item', ...]` — uključujući `['inventory-item', id]`.
 * - Zato su u set-ovima samo "krovni" ključevi bez ID-jeva.
 */

import type { QueryKey } from '@tanstack/react-query';

/**
 * Sve što utiče na stanje magacina:
 * - stanje artikala (list + detail)
 * - lotovi (list + expiring)
 * - transakcije (list + by-item)
 * - dashboard low-stock kartica
 *
 * Koristi se kad mutacija menja `quantity_on_hand` ili kreira/briše tx/lot.
 */
export const INVENTORY_FULL_KEYS: readonly QueryKey[] = [
  ['inventory-items'],
  ['inventory-item'],
  ['inventory-batches'],
  ['inventory-batches-expiring'],
  ['inventory-transactions'],
  ['inventory-transactions-by-item'],
  ['dashboard-low-stock'],
] as const;

/**
 * Fakture + stavke + veza za karton (medical record).
 * Koristi se kad mutacija menja invoice ili invoice_item.
 */
export const INVOICE_KEYS: readonly QueryKey[] = [
  ['invoices'],
  ['invoice-items'],
  ['invoice-by-record'],
] as const;

/**
 * Samo lotovi (uži set) — za mutacije koje ne diraju quantity_on_hand,
 * npr. izmena `expiryDate` na lotu (InventoryBatchModal.update).
 */
export const BATCH_ONLY_KEYS: readonly QueryKey[] = [
  ['inventory-batches'],
  ['inventory-batches-expiring'],
] as const;

/**
 * Pet health alerts (alergije, hronike, posebne napomene).
 * - `pet-health-alerts` → banner data u 4 UI lokacije (editor, profil, appointment, grid)
 * - `medical-records` → hasActiveAlerts flag u listing-u (MedicalRecordsPage ikonica upozorenja)
 *
 * Koristi se kad CRUD mutacija u PetHealthAlertsEditorModal kreira/menja/briše alert.
 */
export const PET_HEALTH_ALERTS_KEYS: readonly QueryKey[] = [
  ['pet-health-alerts'], // banner data u svim lokacijama
  ['medical-records'], // hasActiveAlerts u MedicalRecordsPage grid-u
  ['pets'], // hasActiveAlerts u PetsPage grid-u
] as const;
