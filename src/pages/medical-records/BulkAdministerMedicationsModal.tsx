import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { medicationAdministrationsApi } from '@/api/medication-administrations';
import { inventoryItemsApi } from '@/api/inventory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';
import { ROUTE_OPTIONS } from '@/constants/medicationRoutes';
import type {
  CreateMedicationAdministrationRequest,
  InventoryItem,
  MedicationQuickPickItem,
  MedicationRoute,
} from '@/types';

const { Text } = Typography;
const RECENT_LIMIT = 6;
const FREQUENT_LIMIT = 8;

// Const dodaš na vrh fajla (ispod import-a, iznad Props interface-a)

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  medicalRecordId: string;
  petId: string;
  vetId: string;
}

interface PickableItem {
  id: string;
  name: string;
  quantityOnHand: number;
  unit: string | null;
}

const fromInventoryItem = (it: InventoryItem): PickableItem => ({
  id: it.id,
  name: it.name,
  quantityOnHand: it.quantityOnHand,
  unit: it.unit,
});

const fromQuickPick = (it: MedicationQuickPickItem): PickableItem => ({
  id: it.inventoryItemId,
  name: it.name,
  quantityOnHand: it.quantityOnHand,
  unit: it.unit,
});

export default function BulkAdministerMedicationsModal({
  open,
  onClose,
  onSuccess,
  medicalRecordId,
  petId,
  vetId,
}: Props) {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<InputRef>(null);

  // ===== State =====
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [perRowData, setPerRowData] = useState<
    Record<string, { dosage: string; instructions: string }>
  >({});
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, PickableItem>>(new Map());
  const [administeredDate, setAdministeredDate] = useState<dayjs.Dayjs>(dayjs());
  const [route, setRoute] = useState<MedicationRoute | null>(null);

  // ===== Queries =====
  const { data: quickPicks } = useQuery({
    queryKey: ['med-admin-quick-picks'],
    queryFn: () => medicationAdministrationsApi.getQuickPicks(10).then((r) => r.data),
    enabled: open,
  });

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-medications-bulk', debouncedSearch, page],
    queryFn: () => inventoryItemsApi.getAll(page, 10, debouncedSearch || undefined, 'MEDICATION'),
    enabled: open && debouncedSearch.trim().length > 0,
  });

  const items: InventoryItem[] = itemsData?.data?.content ?? [];
  const totalItems = itemsData?.data?.totalElements ?? 0;

  // AutoFocus search pri otvaranju
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset state pri zatvaranju
  useEffect(() => {
    if (!open) {
      setSearch('');
      setPage(0);
      setSelectedIds([]);
      setPerRowData({});
      setSelectedItemsMap(new Map());
      setAdministeredDate(dayjs());
      setRoute(null);
    }
  }, [open]);

  // ===== Helpers =====
  const addToCart = (item: PickableItem) => {
    if (selectedIds.includes(item.id)) return;
    setSelectedIds((prev) => [...prev, item.id]);
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      next.set(item.id, item);
      return next;
    });
  };

  const removeFromCart = (id: string) => {
    setSelectedIds((prev) => prev.filter((k) => k !== id));
    setPerRowData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // selectedItemsMap zadržavamo radi konzistentnog name lookup-a pri ponovnom dodavanju iz druge stranice
  };

  const updateRowData = (id: string, field: 'dosage' | 'instructions', value: string) => {
    setPerRowData((prev) => ({
      ...prev,
      [id]: {
        dosage: prev[id]?.dosage ?? '',
        instructions: prev[id]?.instructions ?? '',
        [field]: value,
      },
    }));
  };

  const applyDosageToAll = () => {
    if (selectedIds.length < 2) return;
    const firstDosage = perRowData[selectedIds[0]]?.dosage ?? '';
    setPerRowData((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = { dosage: firstDosage, instructions: next[id]?.instructions ?? '' };
      });
      return next;
    });
  };

  const applyInstructionsToAll = () => {
    if (selectedIds.length < 2) return;
    const firstInstr = perRowData[selectedIds[0]]?.instructions ?? '';
    setPerRowData((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = { dosage: next[id]?.dosage ?? '', instructions: firstInstr };
      });
      return next;
    });
  };

  // ===== Mutation =====
  const mutation = useMutation({
    mutationFn: (reqs: CreateMedicationAdministrationRequest[]) =>
      medicationAdministrationsApi.createBulk(reqs),
    onSuccess: (res) => {
      message.success(`Evidentirano ${res.data.length} aplikovanih lekova`);
      invalidateAndBroadcast(queryClient, [
        ['med-admin-by-mr', medicalRecordId],
        ['medication-administrations'],
        ['med-admin-quick-picks'],
        ['inventory-medications-search'],
        ['inventory-medications-bulk'],
      ]);
      onSuccess();
      onClose();
    },
    onError: () => message.error('Greška pri bulk unosu lekova'),
  });

  const canSubmit = selectedIds.length > 0 && !!administeredDate && !mutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const requests: CreateMedicationAdministrationRequest[] = selectedIds.map((id) => {
      const item = selectedItemsMap.get(id);
      const rowData = perRowData[id] ?? { dosage: '', instructions: '' };
      return {
        medicalRecordId,
        petId,
        vetId,
        inventoryItemId: id,
        medicationName: item?.name ?? '',
        dosage: rowData.dosage.trim() || undefined,
        route: route ?? undefined,
        administeredDate: administeredDate.format('YYYY-MM-DD'),
        instructions: rowData.instructions.trim() || undefined,
      };
    });
    mutation.mutate(requests);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canSubmit) handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canSubmit, selectedIds, perRowData, administeredDate, route]);

  // Enter u search input — dodaj prvi rezultat
  const handleSearchEnter = () => {
    if (items.length === 0) return;
    addToCart(fromInventoryItem(items[0]));
    setSearch('');
  };

  // ===== Render helpers =====
  const renderStockTag = (qty: number, unit: string | null) => {
    if (qty <= 0) return <Tag color='red'>Van lagera</Tag>;
    return (
      <Tag color='green'>
        {qty} {unit ?? ''}
      </Tag>
    );
  };

  // ===== "Korpa" — selektovane stavke =====
  const cartItems: PickableItem[] = selectedIds
    .map((id) => selectedItemsMap.get(id))
    .filter((x): x is PickableItem => !!x);

  const cartColumns: ColumnsType<PickableItem> = [
    {
      title: 'Lek',
      key: 'name',
      render: (_, rec) => (
        <Space size={4}>
          <Text strong>{rec.name}</Text>
          {rec.quantityOnHand <= 0 && (
            <Tag color='red' style={{ marginLeft: 4 }}>
              Van lagera
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Doza',
      key: 'dosage',
      width: 130,
      render: (_, rec) => (
        <Input
          size='small'
          placeholder='npr. 5 ml'
          value={perRowData[rec.id]?.dosage ?? ''}
          onChange={(e) => updateRowData(rec.id, 'dosage', e.target.value)}
        />
      ),
    },
    {
      title: 'Beleška',
      key: 'instructions',
      width: 160,
      render: (_, rec) => (
        <Input
          size='small'
          placeholder='opciono'
          value={perRowData[rec.id]?.instructions ?? ''}
          onChange={(e) => updateRowData(rec.id, 'instructions', e.target.value)}
        />
      ),
    },
    {
      key: 'actions',
      width: 40,
      render: (_, rec) => (
        <Button
          type='text'
          danger
          size='small'
          icon={<CloseOutlined />}
          onClick={() => removeFromCart(rec.id)}
        />
      ),
    },
  ];

  // ===== "Dostupni" — izvor =====
  const availableColumns: ColumnsType<InventoryItem> = [
    { title: 'Naziv', dataIndex: 'name', key: 'name' },
    {
      title: 'Lager',
      dataIndex: 'quantityOnHand',
      key: 'qty',
      width: 130,
      render: (qty: number, rec) => renderStockTag(qty, rec.unit),
    },
    {
      title: '',
      key: 'action',
      width: 130,
      render: (_, rec) => {
        const inCart = selectedIds.includes(rec.id);
        if (inCart) {
          return (
            <Button size='small' icon={<CheckOutlined />} disabled>
              U korpi
            </Button>
          );
        }
        return (
          <Button
            size='small'
            type='primary'
            ghost
            icon={<PlusOutlined />}
            onClick={() => addToCart(fromInventoryItem(rec))}
          >
            Dodaj
          </Button>
        );
      },
    },
  ];

  const renderChips = (label: string, picks: MedicationQuickPickItem[]) => {
    if (picks.length === 0) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <Text type='secondary' style={{ marginRight: 8 }}>
          {label}:
        </Text>
        <Space wrap size={[4, 4]}>
          {picks.map((it) => {
            const checked = selectedIds.includes(it.inventoryItemId);
            return (
              <Tag.CheckableTag
                key={it.inventoryItemId}
                checked={checked}
                onChange={() => {
                  if (checked) removeFromCart(it.inventoryItemId);
                  else addToCart(fromQuickPick(it));
                }}
              >
                {it.name}
                {it.quantityOnHand <= 0 && ' ⚠'}
              </Tag.CheckableTag>
            );
          })}
        </Space>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title='Brzi unos više aplikovanih lekova'
      width={760}
      destroyOnClose
      footer={null}
    >
      {/* Akcije na vrhu — uvek vidljive bez skrolovanja */}
      <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button onClick={onClose}>Otkaži</Button>
        <Button
          type='primary'
          loading={mutation.isPending}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Sačuvaj {selectedIds.length} stavki
        </Button>
      </Space>

      {/* Header — search + globalni datum + globalni route */}
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          ref={searchInputRef}
          placeholder='Pretraži lek...'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          onPressEnter={handleSearchEnter}
          allowClear
        />
        <DatePicker
          value={administeredDate}
          onChange={(val) => val && setAdministeredDate(val)}
          format='DD.MM.YYYY'
          allowClear={false}
          style={{ width: 160 }}
        />
        <Select
          placeholder='Način primene'
          value={route}
          onChange={(v) => setRoute(v)}
          options={ROUTE_OPTIONS}
          allowClear
          style={{ width: 160 }}
        />
      </Space.Compact>

      {/* Quick-picks chip rows */}
      {renderChips('Nedavno', (quickPicks?.recent ?? []).slice(0, RECENT_LIMIT))}
      {renderChips('Najčešće (30d)', (quickPicks?.frequent ?? []).slice(0, FREQUENT_LIMIT))}

      {/* "Izabrano" panel — vidljiv samo ako ima selekcije */}
      {cartItems.length > 0 && (
        <Card
          size='small'
          title={`Izabrano (${cartItems.length})`}
          style={{ marginBottom: 12, marginTop: 8 }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <Table<PickableItem>
            rowKey='id'
            size='small'
            dataSource={cartItems}
            columns={cartColumns}
            pagination={false}
            showHeader={false}
          />
          {selectedIds.length >= 2 && (
            <Space style={{ marginTop: 8 }} size={4}>
              <Button size='small' onClick={applyDosageToAll}>
                Primeni dozu 1. reda na sve
              </Button>
              <Button size='small' onClick={applyInstructionsToAll}>
                Primeni belešku 1. reda na sve
              </Button>
            </Space>
          )}
        </Card>
      )}

      {/* "Dostupni" — vidljivi samo kad ima search query-ja */}
      {debouncedSearch.trim().length > 0 ? (
        <>
          <Text type='secondary' style={{ display: 'block', marginBottom: 4 }}>
            Dostupni lekovi
          </Text>
          <Table<InventoryItem>
            rowKey='id'
            size='small'
            dataSource={items}
            columns={availableColumns}
            pagination={{
              current: page + 1,
              pageSize: 10,
              total: totalItems,
              onChange: (p) => setPage(p - 1),
              showSizeChanger: false,
              size: 'small',
            }}
          />
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            color: 'rgba(0,0,0,0.45)',
            fontStyle: 'italic',
          }}
        >
          Otkucaj naziv leka za pretragu, ili koristi brze izbore iznad.
        </div>
      )}
    </Modal>
  );
}
