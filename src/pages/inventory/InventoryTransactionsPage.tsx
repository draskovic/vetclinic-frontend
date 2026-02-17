import { useState } from 'react';
import { Table, Button, Space, Input, Popconfirm, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryTransactionsApi, inventoryItemsApi } from '../../api';
import type { InventoryTransaction, InventoryTransactionType } from '../../types';
import type { ColumnsType } from 'antd/es/table';
import InventoryTransactionModal from './InventoryTransactionModal';
import { useNavigate } from 'react-router-dom';

import dayjs from 'dayjs';

const typeConfig: Record<InventoryTransactionType, { color: string; label: string }> = {
  IN: { color: 'green', label: 'Ulaz' },
  OUT: { color: 'red', label: 'Izlaz' },
  ADJUSTMENT: { color: 'blue', label: 'Korekcija' },
  EXPIRED: { color: 'orange', label: 'Isteklo' },
};

export default function InventoryTransactionsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterItem, setFilterItem] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryTransaction | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', page],
    queryFn: () => inventoryTransactionsApi.getAll(page, 20).then((r) => r.data),
  });

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => inventoryItemsApi.getAll(0, 1000).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryTransactionsApi.delete(id),
    onSuccess: () => {
      message.success('Transakcija obrisana');
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
  });

  const filtered = data?.content?.filter((tx) => {
    const matchesSearch = [tx.inventoryItemName, tx.note, tx.performedByName]
      .filter(Boolean)
      .some((val) => val!.toLowerCase().includes(search.toLowerCase()));
    const matchesItem = filterItem ? tx.inventoryItemId === filterItem : true;
    return matchesSearch && matchesItem;
  });

  const columns: ColumnsType<InventoryTransaction> = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      width: 150,
      render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Artikal',
      dataIndex: 'inventoryItemName',
      sorter: (a, b) => (a.inventoryItemName ?? '').localeCompare(b.inventoryItemName ?? ''),
    },
    {
      title: 'Tip',
      dataIndex: 'type',
      width: 120,
      render: (type: InventoryTransactionType) => (
        <span style={{ color: typeConfig[type]?.color, fontWeight: 600 }}>
          {typeConfig[type]?.label ?? type}
        </span>
      ),
    },
    {
      title: 'Količina',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
    },
    {
      title: 'Izvršio',
      dataIndex: 'performedByName',
      width: 180,
      render: (val: string | null) => val ?? '-',
    },
    {
      title: 'Napomena',
      dataIndex: 'note',
      ellipsis: true,
      render: (val: string | null) => val ?? '-',
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
          <Popconfirm
            title='Obrisati transakciju?'
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button icon={<DeleteOutlined />} size='small' danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input
            placeholder='Pretraga po artiklu, napomeni...'
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder='Filtriraj po artiklu'
            value={filterItem}
            onChange={(val) => setFilterItem(val)}
            allowClear
            style={{ width: 250 }}
            showSearch
            optionFilterProp='children'
          >
            {items?.content?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
        <Space>
          <Button onClick={() => navigate('/inventory')}>Artikli</Button>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Nova transakcija
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

      <InventoryTransactionModal
        open={modalOpen}
        transaction={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
