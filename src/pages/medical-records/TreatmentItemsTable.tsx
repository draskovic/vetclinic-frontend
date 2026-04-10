import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Popconfirm, message, Select, Typography, Tooltip, Tag } from 'antd';
import { DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { servicesApi, treatmentsApi, inventoryItemsApi, serviceInventoryItemsApi } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Treatment } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface TreatmentItemsTableProps {
  medicalRecordId: string | null; // null = nova intervencija, još nije kreirana
  vetId: string; // preuzima veterinara iz forme
}

export default function TreatmentItemsTable({ medicalRecordId, vetId }: TreatmentItemsTableProps) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const queryClient = useQueryClient();
  const [serviceSearch, setServiceSearch] = useState('');
  const debouncedServiceSearch = useDebouncedValue(serviceSearch, 300);

  const { data: servicesData } = useQuery({
    queryKey: ['services-search', debouncedServiceSearch],
    queryFn: () => servicesApi.getAll(0, 20, debouncedServiceSearch || undefined),
  });

  const { data: treatmentsData, refetch } = useQuery({
    queryKey: ['treatments', medicalRecordId],
    queryFn: () => treatmentsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  useEffect(() => {
    if (treatmentsData) {
      setTreatments(treatmentsData.data);
    }
  }, [treatmentsData]);

  // Low-stock artikli za upozorenja
  const { data: lowStockData } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: () => inventoryItemsApi.getLowStock().then((r) => r.data),
  });

  // Mapiranja usluga → inventar artikli (za tooltip upozorenja)
  const { data: allMappings } = useQuery({
    queryKey: ['service-inventory-mappings', medicalRecordId],
    queryFn: async () => {
      const sids = [...new Set(treatments.map((t) => t.serviceId).filter(Boolean) as string[])];
      const map: Record<string, Array<{ name: string; isLow: boolean }>> = {};
      for (const sid of sids) {
        const res = await serviceInventoryItemsApi.getByService(sid);
        map[sid] = (res.data ?? []).map((item) => ({
          name: item.inventoryItemName,
          isLow: lowStockIds.has(item.inventoryItemId),
        }));
      }
      return map;
    },
    enabled: treatments.length > 0 && lowStockData !== undefined,
  });

  const lowStockIds = useMemo(() => new Set(lowStockData?.map((i) => i.id) ?? []), [lowStockData]);

  const serviceOptions = useMemo(
    () =>
      servicesData?.content.map((s) => ({
        label: `${s.sku ? s.sku + ' — ' : ''}${s.name}`,
        value: s.id,
      })) ?? [],
    [servicesData],
  );

  const createMutation = useMutation({
    mutationFn: (serviceId: string) =>
      treatmentsApi.create({
        medicalRecordId: medicalRecordId!,
        vetId: vetId,
        name: serviceOptions.find((s) => s.value === serviceId)?.label ?? '',
        serviceId: serviceId,
      }),
    onSuccess: () => {
      message.success('Usluga dodata!');
      refetch();
      invalidateAndBroadcast(queryClient, [
        ['invoice-by-record'],
        ['invoices'],
        ['invoice-items'],
        ['service-inventory-mappings'],
        // Inventar — sva mesta koja prikazuju stanje
        ['inventory-items'],
        ['inventory-item'],
        ['inventory-batches'],
        ['inventory-transactions-by-item'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
    },

    onError: () => message.error('Greška pri dodavanju usluge!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentsApi.delete(id),
    onSuccess: () => {
      message.success('Usluga uklonjena!');
      refetch();
      invalidateAndBroadcast(queryClient, [
        ['invoice-by-record'],
        ['invoices'],
        ['invoice-items'],
        ['service-inventory-mappings'],
        // Inventar — reverzija FIFO dedukcije
        ['inventory-items'],
        ['inventory-item'],
        ['inventory-batches'],
        ['inventory-transactions-by-item'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
    },

    onError: () => message.error('Greška pri brisanju!'),
  });

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre dodavanja usluga.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={treatments}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          {
            title: 'Usluga',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Treatment) => {
              const mapping = allMappings?.[record.serviceId ?? ''];
              const hasLow = mapping?.some((m) => m.isLow);
              return (
                <span>
                  {name}
                  {hasLow && (
                    <Tooltip
                      title={
                        <>
                          Nizak nivo zaliha:
                          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            {mapping
                              ?.filter((m) => m.isLow)
                              .map((m) => (
                                <li key={m.name}>{m.name}</li>
                              ))}
                          </ul>
                        </>
                      }
                    >
                      <Tag color='orange' style={{ marginLeft: 8 }}>
                        <WarningOutlined /> Nizak lager
                      </Tag>
                    </Tooltip>
                  )}
                </span>
              );
            },
          },

          {
            title: '',
            key: 'actions',
            width: 60,
            render: (_, record) => (
              <Popconfirm
                title='Ukloniti uslugu?'
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button type='text' danger icon={<DeleteOutlined />} size='small' />
              </Popconfirm>
            ),
          },
        ]}
        title={() => (
          <Select
            placeholder='Dodaj uslugu...'
            options={serviceOptions}
            showSearch
            style={{ width: '100%' }}
            value={null}
            onChange={(serviceId) => {
              if (serviceId) {
                createMutation.mutate(serviceId);
                setServiceSearch('');
              }
            }}
            filterOption={false}
            onSearch={(value) => setServiceSearch(value)}
            onInputKeyDown={(e) => {
              if (e.key === ' ') e.stopPropagation();
            }}
            loading={createMutation.isPending}
          />
        )}
      />
    </div>
  );
}
