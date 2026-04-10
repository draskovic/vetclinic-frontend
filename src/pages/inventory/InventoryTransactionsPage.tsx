import { useState } from 'react';
import { Table, Button, Space, Input, Popconfirm, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryTransactionsApi, inventoryItemsApi } from '../../api';
import type { InventoryTransaction, InventoryTransactionType } from '../../types';
import type { ColumnsType } from 'antd/es/table';
import InventoryTransactionModal from './InventoryTransactionModal';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import dayjs from 'dayjs';

const typeConfig: Record<InventoryTransactionType, { color: string; label: string }> = {
  IN: { color: 'green', label: 'Ulaz' },
  OUT: { color: 'red', label: 'Izlaz' },
  ADJUSTMENT: { color: 'blue', label: 'Korekcija' },
  EXPIRED: { color: 'orange', label: 'Isteklo' },
};

export default function InventoryTransactionsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterItem, setFilterItem] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryTransaction | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', page, pageSize, debouncedSearch, filterType, filterItem],
    queryFn: () =>
      inventoryTransactionsApi
        .getAll(page - 1, pageSize, debouncedSearch || undefined, filterType, filterItem)
        .then((r) => r.data),
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

  const columns: ColumnsType<InventoryTransaction> = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      width: 150,
      render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Artikal',
      dataIndex: 'inventoryItemName',
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder='Filtriraj po artiklu'
            value={filterItem}
            onChange={(val) => {
              setFilterItem(val);
              setPage(1);
            }}
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
          <Select
            placeholder='Tip transakcije'
            value={filterType}
            onChange={(val) => {
              setFilterType(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: 'IN', label: 'Ulaz' },
              { value: 'OUT', label: 'Izlaz' },
              { value: 'ADJUSTMENT', label: 'Korekcija' },
              { value: 'EXPIRED', label: 'Isteklo' },
            ]}
          />
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
