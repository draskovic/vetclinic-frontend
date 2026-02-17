import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { usersApi } from '@/api/users';
import type { User } from '@/types';
import dayjs from 'dayjs';
import UserModal from './UserModal';

const { Title } = Typography;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      message.success('Korisnik je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.roleName.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<User> = [
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
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      render: (val) => val ?? '-',
    },
    {
      title: 'Rola',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (val: string) => {
        const color = val === 'SUPER_ADMIN' ? '#faad14' : val === 'ADMIN' ? '#1890ff' : '#52c41a';
        return <span style={{ color, fontWeight: 600 }}>{val}</span>;
      },
    },
    {
      title: 'Specijalizacija',
      dataIndex: 'specialization',
      key: 'specialization',
      render: (val) => val ?? '-',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) =>
        active ? (
          <span style={{ color: '#52c41a', fontWeight: 600 }}>Aktivan</span>
        ) : (
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Neaktivan</span>
        ),
    },
    {
      title: 'Poslednji login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (val) => (val ? dayjs(val).format('DD.MM.YYYY HH:mm') : '-'),
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
              setEditingUser(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje korisnika'
            description='Da li ste sigurni da želite da obrišete ovog korisnika?'
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
          Korisnici
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
        >
          Novi korisnik
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po imenu, emailu ili roli...'
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
            showTotal: (total) => `Ukupno: ${total} korisnika`,
          }}
        />
      </Card>

      <UserModal
        open={modalOpen}
        user={editingUser}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
      />
    </div>
  );
}
