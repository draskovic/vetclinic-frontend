import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { ownersApi } from '@/api/owners';
import type { Owner } from '@/types';
import OwnerModal from './OwnerModal';

const { Title } = Typography;

export default function OwnersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owners', page],
    queryFn: () => ownersApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ownersApi.delete(id),
    onSuccess: () => {
      message.success('Vlasnik je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['owners'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingOwner(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingOwner(null);
  };

  const filteredData = search
    ? data?.content.filter(
        (o) =>
          `${o.firstName} ${o.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          o.phone.includes(search),
      )
    : data?.content;

  const columns: ColumnsType<Owner> = [
    {
      title: 'Ime i prezime',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`,
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email ?? <span style={{ color: '#8c8c8c' }}>Ni je uneto</span>,
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Grad',
      dataIndex: 'city',
      key: 'city',
      render: (city) => city ?? '-',
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type='text' icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title='Brisanje vlasnika'
            description='Da li ste sigurni da želite da obrišete ovog vlasnika?'
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText='Da'
            cancelText='Ne'
            okButtonProps={{ danger: true }}
          >
            <Button
              type='text'
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            />
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
          Vlasnici
        </Title>
        <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>
          Dodaj vlasnika
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po imenu ili telefonu...'
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
            showTotal: (total) => `Ukupno: ${total} vlasnika`,
          }}
        />
      </Card>

      <OwnerModal open={modalOpen} owner={editingOwner} onClose={handleModalClose} />
    </div>
  );
}
