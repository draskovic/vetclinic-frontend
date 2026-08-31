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
  const searchFromUrl = searchParams.get('search');
  const [search, setSearch] = useState(searchFromUrl || '');

  // State se menja TOKOM RENDER-a (react.dev "adjust state when props change"),
  // a čišćenje URL-a ostaje u effect-u jer je navigacija eksterni sistem.
  const [prevUrlSearch, setPrevUrlSearch] = useState(searchFromUrl);
  if (prevUrlSearch !== searchFromUrl) {
    setPrevUrlSearch(searchFromUrl);
    if (searchFromUrl) setSearch(searchFromUrl);
  }

  useEffect(() => {
    if (!searchFromUrl) return;
    // Ukloni samo 'search' parametar — ostavi ostale netaknute
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
  }, [searchFromUrl, searchParams, setSearchParams]);

  return [search, setSearch];
}
