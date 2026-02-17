import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { clinicsApi } from '@/api/clinics';
import type { Clinic, SubscriptionPlan } from '@/types';
import dayjs from 'dayjs';
import ClinicModal from './ClinicModal';

const { Title } = Typography;

const planConfig: Record<SubscriptionPlan, { label: string; color: string }> = {
  BASIC: { label: 'Basic', color: 'default' },
  STANDARD: { label: 'Standard', color: 'blue' },
  PREMIUM: { label: 'Premium', color: 'gold' },
};

export default function ClinicsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clinics', page],
    queryFn: () => clinicsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clinicsApi.delete(id),
    onSuccess: () => {
      message.success('Klinika je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<Clinic> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (val) => val ?? '-',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      render: (val) => val ?? '-',
    },
    {
      title: 'Grad',
      dataIndex: 'city',
      key: 'city',
      render: (val) => val ?? '-',
    },
    {
      title: 'Plan',
      dataIndex: 'subscriptionPlan',
      key: 'subscriptionPlan',
      render: (plan: SubscriptionPlan) => {
        const config = planConfig[plan];
        return config ? <Tag color={config.color}>{config.label}</Tag> : '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) =>
        active ? <Tag color='green'>Aktivna</Tag> : <Tag color='red'>Neaktivna</Tag>,
    },
    {
      title: 'Pretplata do',
      dataIndex: 'subscriptionExpiresAt',
      key: 'subscriptionExpiresAt',
      render: (val) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type='text'
            icon={<EditOutlined />}
            onClick={() => {
              setEditingClinic(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje klinike'
            description='Da li ste sigurni da želite da obrišete ovu kliniku?'
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText='Da'
            cancelText='Ne'
            okButtonProps={{ danger: true }}
          >
            <Button type='text' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Klinike
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingClinic(null);
            setModalOpen(true);
          }}
        >
          Dodaj kliniku
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po nazivu, gradu ili emailu...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />

        <Table
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={filteredData}
          rowKey='id'
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.totalElements,
            pageSize: 10,
            onChange: setPage,
            showTotal: (total) => `Ukupno: ${total} klinika`,
          }}
        />
      </Card>

      <ClinicModal
        open={modalOpen}
        clinic={editingClinic}
        onClose={() => {
          setModalOpen(false);
          setEditingClinic(null);
        }}
      />
    </div>
  );
}
