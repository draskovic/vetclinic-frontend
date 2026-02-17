import { useState } from 'react';
import { Table, Button, Space, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { breedsApi } from '@/api/breeds';
import type { Breed } from '@/types';
import BreedModal from './BreedModal';

const { Title } = Typography;

export default function BreedPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['breeds', page],
    queryFn: () => breedsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => breedsApi.delete(id),
    onSuccess: () => {
      message.success('Rasa je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['breeds'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const columns: ColumnsType<Breed> = [
    {
      title: 'Naziv rase',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Vrsta',
      dataIndex: 'speciesName',
      key: 'speciesName',
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
              setEditingBreed(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje rase'
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
          Rase
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingBreed(null);
            setModalOpen(true);
          }}
        >
          Dodaj rasu
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
            showTotal: (total) => `Ukupno: ${total} rasa`,
          }}
        />
      </Card>

      <BreedModal
        open={modalOpen}
        breed={editingBreed}
        onClose={() => {
          setModalOpen(false);
          setEditingBreed(null);
        }}
      />
    </div>
  );
}
