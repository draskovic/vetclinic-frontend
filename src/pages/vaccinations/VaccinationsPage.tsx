import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { vaccinationsApi } from '@/api/vaccinations';
import type { Vaccination } from '@/types';
import dayjs from 'dayjs';
import VaccinationModal from './VaccinationModal';

const { Title } = Typography;

export default function VaccinationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vaccinations', page],
    queryFn: () => vaccinationsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaccinationsApi.delete(id),
    onSuccess: () => {
      message.success('Vakcinacija je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (v) =>
          v.petName.toLowerCase().includes(search.toLowerCase()) ||
          v.vetName.toLowerCase().includes(search.toLowerCase()) ||
          v.vaccineName.toLowerCase().includes(search.toLowerCase()) ||
          (v.manufacturer ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const getDueStatus = (nextDueDate: string | null) => {
    if (!nextDueDate) return null;
    const days = dayjs(nextDueDate).diff(dayjs(), 'day');
    if (days < 0) return { label: 'Istekla', color: 'red' };
    if (days <= 30) return { label: 'Uskoro', color: 'orange' };
    return { label: 'Aktivna', color: 'green' };
  };

  const columns: ColumnsType<Vaccination> = [
    {
      title: 'Datum',
      dataIndex: 'administeredAt',
      key: 'administeredAt',
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.administeredAt).unix() - dayjs(b.administeredAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
      key: 'petName',
    },
    {
      title: 'Vakcina',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
    },
    {
      title: 'Proizvođač',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      render: (val) => val ?? '-',
    },
    {
      title: 'Veterinar',
      dataIndex: 'vetName',
      key: 'vetName',
    },
    {
      title: 'Sledeća doza',
      dataIndex: 'nextDueDate',
      key: 'nextDueDate',
      render: (val) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = getDueStatus(record.nextDueDate);
        if (!status) return <span style={{ color: '#8c8c8c' }}>-</span>;
        return <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>;
      },
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
              setEditingVaccination(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje vakcinacije'
            description='Da li ste sigurni da želite da obrišete ovu vakcinaciju?'
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
          Vakcinacije
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingVaccination(null);
            setModalOpen(true);
          }}
        >
          Nova vakcinacija
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po ljubimcu, vakcini, proizvođaču ili veterinaru...'
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
            showTotal: (total) => `Ukupno: ${total} vakcinacija`,
          }}
        />
      </Card>

      <VaccinationModal
        open={modalOpen}
        vaccination={editingVaccination}
        onClose={() => {
          setModalOpen(false);
          setEditingVaccination(null);
        }}
      />
    </div>
  );
}
