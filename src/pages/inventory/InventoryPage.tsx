import { useState } from 'react';
import { Table, Button, Space, Input, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryItemsApi } from '../../api';
import type { InventoryItem, InventoryCategory } from '../../types';
import type { ColumnsType } from 'antd/es/table';
import InventoryItemModal from './InventoryItemModal';
import { useNavigate } from 'react-router-dom';

import dayjs from 'dayjs';

const categoryConfig: Record<InventoryCategory, { color: string; label: string }> = {
  MEDICATION: { color: '#1890ff', label: 'Lek' },
  SUPPLY: { color: '#52c41a', label: 'Potrošni materijal' },
  EQUIPMENT: { color: '#fa8c16', label: 'Oprema' },
};

export default function InventoryPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-items', page],
    queryFn: () => inventoryItemsApi.getAll(page, 20).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryItemsApi.delete(id),
    onSuccess: () => {
      message.success('Artikal obrisan');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  const filtered = data?.content?.filter((item) =>
    [item.name, item.sku, item.unit]
      .filter(Boolean)
      .some((val) => val!.toLowerCase().includes(search.toLowerCase())),
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantityOnHand <= 0)
      return <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Nema na stanju</span>;
    if (item.quantityOnHand <= item.reorderLevel)
      return <span style={{ color: '#fa8c16', fontWeight: 600 }}>Nizak nivo</span>;
    return <span style={{ color: '#52c41a', fontWeight: 600 }}>Na stanju</span>;
  };

  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 120,
    },
    {
      title: 'Kategorija',
      dataIndex: 'category',
      width: 150,
      render: (cat: InventoryCategory) => (
        <span style={{ color: categoryConfig[cat]?.color, fontWeight: 600 }}>
          {categoryConfig[cat]?.label ?? cat}
        </span>
      ),
    },
    {
      title: 'Količina',
      dataIndex: 'quantityOnHand',
      width: 100,
      align: 'right',
      render: (qty: number, record) => `${qty} ${record.unit ?? ''}`.trim(),
    },
    {
      title: 'Status',
      width: 130,
      render: (_: unknown, record) => getStockStatus(record),
    },
    {
      title: 'Nabavna cena',
      dataIndex: 'costPrice',
      width: 120,
      align: 'right',
      render: (val: number) => (val != null ? `${val.toFixed(2)} RSD` : '-'),
    },
    {
      title: 'Prodajna cena',
      dataIndex: 'sellPrice',
      width: 120,
      align: 'right',
      render: (val: number) => (val != null ? `${val.toFixed(2)} RSD` : '-'),
    },
    {
      title: 'Rok trajanja',
      dataIndex: 'expiryDate',
      width: 120,
      render: (val: string | null) => {
        if (!val) return '-';
        const d = dayjs(val);
        const isExpired = d.isBefore(dayjs());
        return (
          <span style={{ color: isExpired ? 'red' : undefined }}>{d.format('DD.MM.YYYY')}</span>
        );
      },
    },
    {
      title: 'Lokacija',
      dataIndex: 'locationName',
      width: 150,
    },
    {
      title: 'Akcije',
      width: 100,
      render: (_: unknown, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size='small'
            onClick={() => {
              setEditing(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm title='Obrisati artikal?' onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} size='small' danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input
          placeholder='Pretraga po nazivu, SKU, jedinici...'
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 350 }}
          allowClear
        />
        <Space>
          <Button onClick={() => navigate('/inventory-transactions')}>Transakcije</Button>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Novi artikal
          </Button>
        </Space>
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

      <InventoryItemModal
        open={modalOpen}
        item={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
