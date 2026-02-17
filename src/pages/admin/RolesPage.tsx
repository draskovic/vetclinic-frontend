import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { rolesApi } from '@/api/roles';
import type { Role } from '@/types';
import RoleModal from './RoleModal';

const { Title } = Typography;

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => rolesApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      message.success('Rola je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : data?.content;

  const parsePermissions = (permissions: string): string[] => {
    try {
      return JSON.parse(permissions);
    } catch {
      return [];
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Permisije',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (val: string) => {
        const perms = parsePermissions(val);
        if (perms.includes('*'))
          return <span style={{ color: '#fa8c16', fontWeight: 600 }}> Sve permisije</span>;
        if (perms.length === 0) return <span style={{ color: 'default' }}>Nema permisija</span>;
        return (
          <Space wrap>
            {perms.map((p) => (
              <span key={p} style={{ color: '#1890ff' }}>
                {p}
              </span>
            ))}
          </Space>
        );
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
              setEditingRole(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje role'
            description='Da li ste sigurni da želite da obrišete ovu rolu?'
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
          Role
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRole(null);
            setModalOpen(true);
          }}
        >
          Nova rola
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po nazivu...'
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
            showTotal: (total) => `Ukupno: ${total} rola`,
          }}
        />
      </Card>

      <RoleModal
        open={modalOpen}
        role={editingRole}
        onClose={() => {
          setModalOpen(false);
          setEditingRole(null);
        }}
      />
    </div>
  );
}
