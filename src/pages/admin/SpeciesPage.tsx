import { useState } from 'react';
import { Table, Button, Space, Card, Typography, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { speciesApi } from '@/api/species';
import type { Species } from '@/types';
import SpeciesModal from './SpeciesModal';

const { Title } = Typography;

export default function SpeciesPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['species', page],
    queryFn: () => speciesApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => speciesApi.delete(id),
    onSuccess: () => {
      message.success('Vrsta je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['species'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const columns: ColumnsType<Species> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Aktivna' : 'Neaktivna'}</Tag>
      ),
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
              setEditingSpecies(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje vrste'
            description='Da li ste sigurni?'
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
          Vrste životinja
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingSpecies(null);
            setModalOpen(true);
          }}
        >
          Dodaj vrstu
        </Button>
      </div>

      <Card>
        <Table
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={data?.content}
          rowKey='id'
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.totalElements,
            pageSize: 10,
            onChange: setPage,
            showTotal: (total) => `Ukupno: ${total} vrsta`,
          }}
        />
      </Card>

      <SpeciesModal
        open={modalOpen}
        species={editingSpecies}
        onClose={() => {
          setModalOpen(false);
          setEditingSpecies(null);
        }}
      />
    </div>
  );
}
