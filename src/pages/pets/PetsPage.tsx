import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { petsApi } from '@/api/pets';
import type { Pet } from '@/types';
import PetModal from './PetModal';

const { Title } = Typography;

const genderLabels: Record<string, { label: string; color: string }> = {
  MALE: { label: 'Muški', color: '#1890ff' },
  FEMALE: { label: 'Ženski', color: '#eb2f96' },
};

export default function PetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['pets', page],
    queryFn: () => petsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => petsApi.delete(id),
    onSuccess: () => {
      message.success('Ljubimac je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.ownerName.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<Pet> = [
    {
      title: 'Ime',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Pet) => (
        <a onClick={() => navigate(`/pets/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
      key: 'ownerName',
    },
    {
      title: 'Vrsta',
      dataIndex: 'speciesName',
      key: 'speciesName',
      render: (val) => val ?? '-',
    },
    {
      title: 'Rasa',
      dataIndex: 'breedName',
      key: 'breedName',
      render: (val) => val ?? '-',
    },
    {
      title: 'Pol',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => {
        if (!gender) return '-';
        const g = genderLabels[gender];
        return <span style={{ color: g.color, fontWeight: 600 }}>{g.label}</span>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) =>
        record.isDeceased ? (
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Preminuo</span>
        ) : (
          <span style={{ color: '#52c41a', fontWeight: 600 }}>Aktivan</span>
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
              setEditingPet(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje ljubimca'
            description='Da li ste sigurni da želite da obrišete ovog ljubimca?'
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
          Ljubimci
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPet(null);
            setModalOpen(true);
          }}
        >
          Dodaj ljubimca
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po imenu ili vlasniku...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey='id'
          loading={isLoading}
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          pagination={{
            current: page,
            total: data?.totalElements,
            pageSize: 10,
            onChange: setPage,
            showTotal: (total) => `Ukupno: ${total} ljubimaca`,
          }}
        />
      </Card>

      <PetModal
        open={modalOpen}
        pet={editingPet}
        onClose={() => {
          setModalOpen(false);
          setEditingPet(null);
        }}
      />
    </div>
  );
}
