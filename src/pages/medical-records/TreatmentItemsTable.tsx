import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Popconfirm, message, Select, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { servicesApi, treatmentsApi } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Treatment } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
      queryClient.invalidateQueries({ queryKey: ['invoice-by-record'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
    },
    onError: () => message.error('Greška pri dodavanju usluge!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentsApi.delete(id),
    onSuccess: () => {
      message.success('Usluga uklonjena!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['invoice-by-record'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
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
