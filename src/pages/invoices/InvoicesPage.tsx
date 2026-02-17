import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { invoicesApi } from '@/api/invoices';
import type { Invoice, InvoiceStatus } from '@/types';
import dayjs from 'dayjs';
import InvoiceModal from './InvoiceModal';

const { Title } = Typography;

const statusConfig: Record<InvoiceStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Nacrt', color: '#8c8c8c' },
  ISSUED: { label: 'Izdata', color: '#1890ff' },
  PAID: { label: 'Plaćena', color: '#52c41a' },
  PARTIALLY_PAID: { label: 'Delimično', color: '#fa8c16' },
  OVERDUE: { label: 'Dospela', color: '#ff4d4f' },
  CANCELLED: { label: 'Stornirana', color: '#8c8c8c' },
  REFUNDED: { label: 'Refundirana', color: '#722ed1' },
};

const formatCurrency = (amount: number, currency: string) => {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: () => invoicesApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      message.success('Faktura je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          i.ownerName.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Broj fakture',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber),
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
      key: 'ownerName',
    },
    {
      title: 'Datum izdavanja',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      render: (val) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
      sorter: (a, b) => dayjs(a.issuedAt ?? '').unix() - dayjs(b.issuedAt ?? '').unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Rok plaćanja',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (val) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Ukupno',
      dataIndex: 'total',
      key: 'total',
      render: (val, record) => formatCurrency(val, record.currency),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: InvoiceStatus) => {
        const config = statusConfig[status];
        return <span style={{ color: config.color, fontWeight: 600 }}>{config.label}</span>;
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
              setEditingInvoice(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje fakture'
            description='Da li ste sigurni da želite da obrišete ovu fakturu?'
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
          Fakture
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingInvoice(null);
            setModalOpen(true);
          }}
        >
          Nova faktura
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po broju fakture ili vlasniku...'
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
            showTotal: (total) => `Ukupno: ${total} faktura`,
          }}
        />
      </Card>

      <InvoiceModal
        open={modalOpen}
        invoice={editingInvoice}
        onClose={() => {
          setModalOpen(false);
          setEditingInvoice(null);
        }}
      />
    </div>
  );
}
