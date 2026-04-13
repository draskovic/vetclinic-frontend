import { useEffect, useState, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { petsApi } from '@/api/pets';
import { ownersApi } from '@/api/owners';
import { medicalRecordsApi } from '@/api/medical-records';
import { invoicesApi } from '@/api/invoices';
import { appointmentsApi } from '@/api/appointments';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import dayjs from 'dayjs';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const openRef = useRef(open);
  openRef.current = open;

  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const newVal = typeof v === 'function' ? v(open) : v;
    setInternalOpen(newVal);
    onOpenChange?.(newVal);
  };

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const next = !openRef.current;
        setInternalOpen(next);
        onOpenChange?.(next);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Recent items iz localStorage
  const [recentItems, setRecentItems] = useState<
    Array<{ type: string; id: string; label: string; path: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem('command-palette-recent') || '[]');
    } catch {
      return [];
    }
  });

  const addRecent = useCallback(
    (item: { type: string; id: string; label: string; path: string }) => {
      setRecentItems((prev) => {
        const filtered = prev.filter((r) => r.id !== item.id);
        const updated = [item, ...filtered].slice(0, 10);
        localStorage.setItem('command-palette-recent', JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const handleSelect = (item: { type: string; id: string; label: string; path: string }) => {
    addRecent(item);
    navigate(item.path);
    setOpen(false);
    setSearch('');
  };

  // Queries — samo kad je palette otvoren i postoji search
  const hasSearch = debouncedSearch.length >= 2;

  const { data: pets } = useQuery({
    queryKey: ['cmd-pets', debouncedSearch],
    queryFn: () => petsApi.getAll(0, 5, debouncedSearch).then((r) => r.data),
    enabled: open && hasSearch,
  });

  const { data: owners } = useQuery({
    queryKey: ['cmd-owners', debouncedSearch],
    queryFn: () => ownersApi.getAll(0, 5, debouncedSearch).then((r) => r.data),
    enabled: open && hasSearch,
  });

  const { data: records } = useQuery({
    queryKey: ['cmd-records', debouncedSearch],
    queryFn: () => medicalRecordsApi.getAll(0, 5, debouncedSearch).then((r) => r.data),
    enabled: open && hasSearch,
  });

  const { data: invoices } = useQuery({
    queryKey: ['cmd-invoices', debouncedSearch],
    queryFn: () => invoicesApi.getAll(0, 5, debouncedSearch).then((r) => r.data),
    enabled: open && hasSearch,
  });

  const todayFrom = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
  const todayTo = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ssZ');

  const { data: todayAppointments } = useQuery({
    queryKey: ['cmd-appointments-today'],
    queryFn: () => appointmentsApi.getByDateRange(todayFrom, todayTo).then((r) => r.data),
    enabled: open && !hasSearch,
  });

  if (!open) return null;

  return (
    <div className='command-palette-overlay' onClick={() => setOpen(false)}>
      <div className='command-palette-container' onClick={(e) => e.stopPropagation()}>
        <Command label='Globalna pretraga' shouldFilter={false}>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder='Pretraži pacijente, vlasnike, intervencije...'
            autoFocus
          />
          <Command.List>
            <Command.Empty>
              {hasSearch ? 'Nema rezultata.' : 'Počnite kucati za pretragu...'}
            </Command.Empty>

            {/* Recent — prikaži kad nema pretrage */}
            {!hasSearch && recentItems.length > 0 && (
              <Command.Group heading='Nedavno'>
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`recent-${item.id}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <span className='cmd-type'>{item.type}</span>
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Današnji termini — prikaži kad nema pretrage */}
            {!hasSearch && (todayAppointments?.length ?? 0) > 0 && (
              <Command.Group heading='Današnji termini'>
                {todayAppointments?.slice(0, 5).map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`appt-${a.id}`}
                    onSelect={() =>
                      handleSelect({
                        type: 'Termin',
                        id: a.id,
                        label: `${dayjs(a.startTime).format('HH:mm')} — ${a.petName} (${a.ownerName})`,
                        path: '/appointments',
                      })
                    }
                  >
                    <span className='cmd-type'>Termin</span>
                    {dayjs(a.startTime).format('HH:mm')} — {a.petName} ({a.ownerName})
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Pacijenti */}
            {hasSearch && (pets?.content?.length ?? 0) > 0 && (
              <Command.Group heading='Pacijenti'>
                {pets?.content.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`pet-${p.id}-${p.name}`}
                    onSelect={() =>
                      handleSelect({
                        type: 'Pacijent',
                        id: p.id,
                        label: `${p.name} — ${p.ownerName || ''}`,
                        path: `/pets/${p.id}`,
                      })
                    }
                  >
                    <span className='cmd-type'>Pacijent</span>
                    {p.patientCode && <span className='cmd-code'>{p.patientCode}</span>}
                    {p.name}
                    {p.speciesName && <span className='cmd-meta'> ({p.speciesName})</span>}
                    {p.ownerName && <span className='cmd-meta'> — {p.ownerName}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Vlasnici */}
            {hasSearch && (owners?.content?.length ?? 0) > 0 && (
              <Command.Group heading='Vlasnici'>
                {owners?.content.map((o) => (
                  <Command.Item
                    key={o.id}
                    value={`owner-${o.id}-${o.firstName}-${o.lastName}`}
                    onSelect={() =>
                      handleSelect({
                        type: 'Vlasnik',
                        id: o.id,
                        label: `${o.firstName} ${o.lastName}`,
                        path: `/owners/${o.id}`,
                      })
                    }
                  >
                    <span className='cmd-type'>Vlasnik</span>
                    {o.clientCode && <span className='cmd-code'>{o.clientCode}</span>}
                    {o.firstName} {o.lastName}
                    {o.phone && <span className='cmd-meta'> — {o.phone}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Intervencije */}
            {hasSearch && (records?.content?.length ?? 0) > 0 && (
              <Command.Group heading='Intervencije'>
                {records?.content.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={`record-${r.id}-${r.petName}`}
                    onSelect={() =>
                      handleSelect({
                        type: 'Intervencija',
                        id: r.id,
                        label: `${r.recordCode || ''} — ${r.petName}`,
                        path: `/medical-records?search=${encodeURIComponent(r.recordCode || r.petName)}`,
                      })
                    }
                  >
                    <span className='cmd-type'>Intervencija</span>
                    {r.recordCode && <span className='cmd-code'>{r.recordCode}</span>}
                    {r.petName}
                    <span className='cmd-meta'> — {dayjs(r.createdAt).format('DD.MM.YYYY')}</span>
                    {r.diagnoses?.length > 0 && (
                      <span className='cmd-meta'>
                        {' '}
                        — {r.diagnoses.map((d) => d.name).join(', ')}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Fakture */}
            {hasSearch && (invoices?.content?.length ?? 0) > 0 && (
              <Command.Group heading='Fakture'>
                {invoices?.content.map((inv) => (
                  <Command.Item
                    key={inv.id}
                    value={`inv-${inv.id}-${inv.invoiceNumber}`}
                    onSelect={() =>
                      handleSelect({
                        type: 'Faktura',
                        id: inv.id,
                        label: `${inv.invoiceNumber} — ${inv.ownerName}`,
                        path: `/invoices?search=${encodeURIComponent(inv.invoiceNumber)}`,
                      })
                    }
                  >
                    <span className='cmd-type'>Faktura</span>
                    <span className='cmd-code'>{inv.invoiceNumber}</span>
                    {inv.ownerName}
                    <span className='cmd-meta'>
                      {' '}
                      — {inv.total?.toLocaleString('sr-RS')} RSD — {inv.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Brze akcije */}
            <Command.Group heading='Akcije'>
              <Command.Item
                value='novi-termin'
                onSelect={() => {
                  navigate('/calendar');
                  setOpen(false);
                }}
              >
                + Novi termin
              </Command.Item>
              <Command.Item
                value='nov-vlasnik'
                onSelect={() => {
                  navigate('/owners');
                  setOpen(false);
                }}
              >
                + Nov vlasnik
              </Command.Item>
              <Command.Item
                value='nova-intervencija'
                onSelect={() => {
                  navigate('/medical-records');
                  setOpen(false);
                }}
              >
                + Nova intervencija
              </Command.Item>
              <Command.Item
                value='inventar'
                onSelect={() => {
                  navigate('/inventory');
                  setOpen(false);
                }}
              >
                Inventar
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
