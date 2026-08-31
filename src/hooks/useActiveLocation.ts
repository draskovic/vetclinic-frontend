import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clinicLocationsApi } from '@/api/clinic-locations';
import { useAuthStore } from '@/store/authStore';
import type { ClinicLocation } from '@/types';

/**
 * Aktivna ("radna") lokacija — jedinstven izvor istine za multi-lokacijski kontekst.
 *
 * VAŽNO: konzumenti UVEK čitaju `activeLocationId` iz ovog hook-a, NIKAD
 * `useAuthStore().activeLocationId` direktno. Store čuva samo EKSPLICITAN izbor
 * korisnika; hook računa EFEKTIVNU lokaciju (izbor → glavna → prva aktivna).
 * Tako obrisana/deaktivirana lokacija iz localStorage-a ne može da "zaglavi" app.
 */
export function useActiveLocation() {
  const { isAuthenticated, activeLocationId: storedId, setActiveLocationId } = useAuthStore();

  const { data, isLoading } = useQuery({
    // isti ključ kao AppointmentCalendarPage → deljen keš + hvata ga
    // invalidacija ['clinic-locations'] iz ClinicSettingsPage (prefix match)
    queryKey: ['clinic-locations', 'active'],
    queryFn: () => clinicLocationsApi.getActive().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // lokacije se retko menjaju; header se montira na svakoj strani
  });

  // glavna lokacija prva (UX u selektoru)
  const locations = useMemo<ClinicLocation[]>(
    () => [...(data ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain)),
    [data],
  );

  // Efektivna lokacija — DERIVED, bez setState u effect-u
  // (react.dev "you might not need an effect" — isti razlog kao fix u MedicalRecordsPage)
  const activeLocationId = useMemo(() => {
    if (storedId && locations.some((l) => l.id === storedId)) return storedId;
    return locations.find((l) => l.isMain)?.id ?? locations[0]?.id ?? null;
  }, [storedId, locations]);

  const activeLocation = locations.find((l) => l.id === activeLocationId) ?? null;

  return {
    activeLocationId,
    activeLocation,
    locations,
    isMultiLocation: locations.length >= 2,
    isLoading,
    setActiveLocation: setActiveLocationId,
  };
}
