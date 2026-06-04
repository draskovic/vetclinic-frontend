import { useState, useMemo } from 'react';
import { Select, Tag, Typography, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { billableItemsApi } from '@/api';
import type { BillableItem } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface BillableItemPickerProps {
  onSelect: (item: BillableItem) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function BillableItemPicker({
  onSelect,
  disabled,
  placeholder = 'Dodaj uslugu ili artikal...',
}: BillableItemPickerProps) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(false); // query tek kad se otvori dropdown
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: items, isFetching } = useQuery({
    queryKey: ['billable-items', debouncedSearch],
    queryFn: () => billableItemsApi.search(debouncedSearch, 25),
    enabled: active,
  });

  const byKey = useMemo(() => {
    const map = new Map<string, BillableItem>();
    (items ?? []).forEach((it) => map.set(`${it.type}:${it.id}`, it));
    return map;
  }, [items]);

  const renderLabel = (it: BillableItem) => {
    const price = it.unitPrice != null ? `${it.unitPrice.toFixed(2)} RSD` : '—';
    return (
      <Space size={6} style={{ width: '100%', justifyContent: 'space-between' }}>
        <span>
          {it.sku ? `${it.sku} — ` : ''}
          {it.name}
        </span>
        <Space size={6}>
          {it.type === 'ITEM' &&
            ((it.quantityOnHand ?? 0) <= 0 ? (
              <Tag color='red'>nema</Tag>
            ) : (
              <Tag color='blue'>
                {it.quantityOnHand} {it.unit ?? ''}
              </Tag>
            ))}
          <Typography.Text type='secondary'>{price}</Typography.Text>
        </Space>
      </Space>
    );
  };

  const services = (items ?? []).filter((i) => i.type === 'SERVICE');
  const goods = (items ?? []).filter((i) => i.type === 'ITEM');

  const options = [
    {
      label: 'Usluge',
      options: services.map((it) => ({ value: `SERVICE:${it.id}`, label: renderLabel(it) })),
    },
    {
      label: 'Artikli',
      options: goods.map((it) => ({ value: `ITEM:${it.id}`, label: renderLabel(it) })),
    },
  ].filter((g) => g.options.length > 0);

  return (
    <Select
      showSearch
      style={{ width: '100%' }}
      placeholder={placeholder}
      value={null}
      disabled={disabled}
      filterOption={false}
      onSearch={setSearch}
      onInputKeyDown={(e) => {
        if (e.key === ' ') e.stopPropagation();
      }}
      onDropdownVisibleChange={(o) => {
        if (o) setActive(true);
      }}
      loading={isFetching}
      options={options}
      notFoundContent={
        isFetching ? 'Pretraga...' : debouncedSearch ? 'Nema rezultata' : 'Kucajte za pretragu...'
      }
      onChange={(val) => {
        const item = byKey.get(val as unknown as string);
        if (item) onSelect(item);
        setSearch('');
      }}
    />
  );
}
