import { useState } from 'react';
import { Table, Button, Space, Input, Popconfirm, message, Select, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api';
import type { Service, ServiceCategory } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import ServiceModal from './ServiceModal';

const categoryConfig: Record<ServiceCategory, { color: string; label: string }> = {
  EXAMINATION: { color: '#1890ff', label: 'Pregled' },
  SURGERY: { color: '#ff4d4f', label: 'Hirurgija' },
  VACCINATION: { color: '#52c41a', label: 'Vakcinacija' },
  LAB: { color: '#800080', label: 'Laboratorija' },
  DENTAL: { color: '#00FFFF', label: 'Stomatologija' },
  GROOMING: { color: '#fa8c16', label: 'Grooming' },
  OTHER: { color: 'default', label: 'Ostalo' },
};

export default function ServicesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['services', page],
    queryFn: () => servicesApi.getAll(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      message.success('Usluga je obrisana');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: () => message.error('Greška pri brisanju'),
  });

  const filtered = data?.content?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const columns: ColumnsType<Service> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Kategorija',
      dataIndex: 'category',
      width: 140,
      render: (cat: ServiceCategory) => (
        <span style={{ color: categoryConfig[cat]?.color, fontWeight: 600 }}>
          {categoryConfig[cat]?.label ?? cat}
        </span>
      ),
    },
    {
      title: 'Cena',
      dataIndex: 'price',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.price - b.price,
      render: (val: number) => `${val.toFixed(2)} RSD`,
    },
    {
      title: 'PDV %',
      dataIndex: 'taxRate',
      width: 80,
      align: 'right',
      render: (val: number) => `${val}%`,
    },
    {
      title: 'Trajanje',
      dataIndex: 'durationMinutes',
      width: 100,
      align: 'right',
      render: (val: number | null) => (val ? `${val} min` : '-'),
    },
    {
      title: 'Kategorija',
      dataIndex: 'category',
      width: 140,
      render: (cat: ServiceCategory) => (
        <span style={{ color: categoryConfig[cat]?.color, fontWeight: 600 }}>
          {categoryConfig[cat]?.label ?? cat}
        </span>
      ),
    },
    {
      title: 'Akcije',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size='small'
            onClick={() => {
              setEditing(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Obrisati uslugu?'
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText='Da'
            cancelText='Ne'
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size='small' danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Usluge
      </Typography.Title>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input
            placeholder='Pretraga po nazivu...'
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder='Kategorija'
            value={categoryFilter || undefined}
            onChange={(val) => setCategoryFilter(val || '')}
            allowClear
            style={{ width: 180 }}
            options={Object.entries(categoryConfig).map(([value, { label }]) => ({
              value,
              label,
            }))}
          />
        </Space>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Nova usluga
        </Button>
      </div>

      <Table
        rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
        rowKey='id'
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{
          current: page + 1,
          pageSize: 20,
          total: data?.totalElements,
          onChange: (p) => setPage(p - 1),
          showTotal: (total) => `Ukupno: ${total}`,
        }}
      />

      <ServiceModal
        open={modalOpen}
        service={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
