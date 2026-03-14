import { useState, useEffect } from 'react';
import { Table, Button, Popconfirm, message, Select, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { servicesApi, treatmentsApi } from '@/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Treatment } from '@/types';

interface TreatmentItemsTableProps {
  medicalRecordId: string | null; // null = nova intervencija, još nije kreirana
  vetId: string; // preuzima veterinara iz forme
}

export default function TreatmentItemsTable({ medicalRecordId, vetId }: TreatmentItemsTableProps) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const { data: servicesData } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => servicesApi.getAll(0, 100),
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

  const serviceOptions =
    servicesData?.content.map((s) => ({
      label: s.name,
      value: s.id,
    })) ?? [];

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
    },
    onError: () => message.error('Greška pri dodavanju usluge!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentsApi.delete(id),
    onSuccess: () => {
      message.success('Usluga uklonjena!');
      refetch();
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
              }
            }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            loading={createMutation.isPending}
          />
        )}
      />
    </div>
  );
}
