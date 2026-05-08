import type { MedicationRoute } from '@/types';

/** Opcije za Select dropdown — sa srpskim labelima */
export const ROUTE_OPTIONS: { value: MedicationRoute; label: string }[] = [
  { value: 'IV', label: 'IV — intravenozno' },
  { value: 'IM', label: 'IM — intramuskularno' },
  { value: 'SC', label: 'SC — subkutano' },
  { value: 'PO', label: 'PO — oralno' },
  { value: 'TOPICAL', label: 'Lokalno' },
  { value: 'INHALATION', label: 'Inhalaciono' },
];

/** Skraćenice za prikaz u tabelama */
export const ROUTE_LABEL: Record<MedicationRoute, string> = {
  IV: 'IV',
  IM: 'IM',
  SC: 'SC',
  PO: 'PO',
  TOPICAL: 'Lokalno',
  INHALATION: 'Inhal.',
};
