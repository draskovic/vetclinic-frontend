import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Popconfirm, message, Select, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api';
import type { Service, ServiceCategory } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import ServiceModal from './ServiceModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const categoryConfig: Record<ServiceCategory, { color: string; label: string }> = {
  EXAMINATION: { color: '#1890ff', label: 'Klinički pregled' },
  MEDICATION_APPLICATION: { color: '#722ed1', label: 'Aplikacija lekova' },
  ANESTHESIA: { color: '#eb2f96', label: 'Anestezija' },
  LAB: { color: '#b37feb', label: 'Laboratorijska dijagnostika' },
  ULTRASOUND: { color: '#9254de', label: 'Ultrazvučna dijagnostika' },
  REPRODUCTION: { color: '#f759ab', label: 'Porodiljstvo i V.O.' },
  STERILIZATION: { color: '#ff7a45', label: 'Sterilizacija i kastracija' },
  SURGERY: { color: '#ff4d4f', label: 'Hirurgija' },
  GROOMING: { color: '#fa8c16', label: 'Kozmetika' },
  PREVENTIVE: { color: '#73d13d', label: 'Preventiva' },
  VACCINATION: { color: '#52c41a', label: 'Vakcinacija' },
  DENTAL: { color: '#13c2c2', label: 'Stomatologija' },
  THERAPY: { color: '#36cfc9', label: 'Terapija' },
  EUTHANASIA: { color: '#595959', label: 'Eutanazija' },
  OTHER: { color: 'default', label: 'Ostalo' },
};

export default function ServicesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['services', page, pageSize, debouncedSearch, categoryFilter],
    queryFn: () =>
      servicesApi.getAll(
        page - 1,
        pageSize,
        debouncedSearch || undefined,
        categoryFilter || undefined,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      message.success('Usluga je obrisana');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: () => message.error('Greška pri brisanju'),
  });

  const columns: ColumnsType<Service> = [
    {
      title: 'Šifra',
      dataIndex: 'sku',
      width: 80,
      render: (val: string | null) => val || '—',
    },
    {
      title: 'Jed.',
      dataIndex: 'unit',
      width: 70,
      render: (val: string | null) => val || '—',
    },

    {
      title: 'Naziv',
      dataIndex: 'name',
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
        dataSource={data?.content}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.totalElements,
          onChange: (p, ps) => {
            if (ps !== pageSize) {
              setPage(1);
              setPageSize(ps);
            } else {
              setPage(p);
            }
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
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
