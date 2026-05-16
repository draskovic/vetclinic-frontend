import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Sinhronizuje search state sa URL ?search=... parametrom.
 * - Pri mount-u: inicijalizuje state iz URL-a.
 * - Pri promeni URL-a (npr. navigate-om iz CommandPalette), state se ažurira.
 * - URL parametar se čisti posle čitanja (da refresh ne zamrzne filter).
 *
 * Vraća [search, setSearch] — kompatibilno sa useState potpisom.
 */
export function useSearchFromUrl(): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearch(searchFromUrl);
      // Ukloni samo 'search' parametar — ostavi ostale netaknute
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return [search, setSearch];
}
