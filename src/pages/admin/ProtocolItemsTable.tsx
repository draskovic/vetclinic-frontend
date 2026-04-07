import { useState, useMemo } from 'react';
import { Table, Button, Popconfirm, message, Select, InputNumber, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { servicesApi, treatmentProtocolItemsApi } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TreatmentProtocolItem } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface ProtocolItemsTableProps {
  protocolId: string | null;
}

export default function ProtocolItemsTable({ protocolId }: ProtocolItemsTableProps) {
  const queryClient = useQueryClient();
  const [serviceSearch, setServiceSearch] = useState('');
  const debouncedServiceSearch = useDebouncedValue(serviceSearch, 300);

  const { data: servicesData } = useQuery({
    queryKey: ['services-search', debouncedServiceSearch],
    queryFn: () => servicesApi.getAll(0, 20, debouncedServiceSearch || undefined),
  });

  const { data: items } = useQuery({
    queryKey: ['protocol-items', protocolId],
    queryFn: () => treatmentProtocolItemsApi.getByProtocol(protocolId!),
    enabled: !!protocolId,
  });

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
      treatmentProtocolItemsApi.create({
        protocolId: protocolId!,
        serviceId: serviceId,
        quantity: 1,
        sortOrder: items?.length ?? 0,
      }),
    onSuccess: () => {
      message.success('Usluga dodata u protokol');
      queryClient.invalidateQueries({ queryKey: ['protocol-items', protocolId] });
      setServiceSearch('');
    },
    onError: () => message.error('Greška pri dodavanju'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      treatmentProtocolItemsApi.update(id, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-items', protocolId] });
    },
    onError: () => message.error('Greška pri izmeni'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentProtocolItemsApi.remove(id),
    onSuccess: () => {
      message.success('Usluga uklonjena iz protokola');
      queryClient.invalidateQueries({ queryKey: ['protocol-items', protocolId] });
    },
    onError: () => message.error('Greška pri brisanju'),
  });

  if (!protocolId) {
    return (
      <Typography.Text type='secondary'>Sačuvajte protokol pre dodavanja usluga.</Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={items ?? []}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          {
            title: 'Šifra',
            dataIndex: 'serviceSku',
            width: 80,
            render: (val: string | null) => val || '—',
          },
          {
            title: 'Usluga',
            dataIndex: 'serviceName',
          },
          {
            title: 'Količina',
            dataIndex: 'quantity',
            width: 100,
            render: (val: number, record: TreatmentProtocolItem) => (
              <InputNumber
                min={1}
                value={val}
                size='small'
                style={{ width: 70 }}
                onChange={(newVal) => {
                  if (newVal && newVal !== val) {
                    updateMutation.mutate({ id: record.id, quantity: newVal });
                  }
                }}
              />
            ),
          },
          {
            title: 'Cena',
            dataIndex: 'servicePrice',
            width: 120,
            align: 'right',
            render: (val: number) => (val != null ? `${Number(val).toFixed(2)} RSD` : '—'),
          },
          {
            title: '',
            key: 'actions',
            width: 60,
            render: (_: unknown, record: TreatmentProtocolItem) => (
              <Popconfirm
                title='Ukloniti uslugu iz protokola?'
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button type='text' danger icon={<DeleteOutlined />} size='small' />
              </Popconfirm>
            ),
          },
        ]}
        title={() => (
          <Select
            placeholder='Dodaj uslugu u protokol...'
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
