import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Card,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { invoicesApi } from '@/api/invoices';
import type { Invoice, InvoiceStatus } from '@/types';
import dayjs from 'dayjs';
import InvoiceModal from './InvoiceModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    if (searchParams.has('search')) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, debouncedSearch, statusFilter],
    queryFn: () =>
      invoicesApi.getAll(page - 1, pageSize, debouncedSearch, statusFilter).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      message.success('Faktura je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const handleDownloadPdf = async (id: string, invoiceNumber: string) => {
    try {
      const response = await invoicesApi.downloadPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faktura-${invoiceNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Greška pri preuzimanju PDF-a');
    }
  };

  const filteredData = data?.content;

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Broj fakture',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
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
          <Tooltip title='Preuzmi PDF'>
            <Button
              type='text'
              icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => handleDownloadPdf(record.id, record.invoiceNumber)}
            />
          </Tooltip>

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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />

        <Select
          placeholder='Filtriraj po statusu'
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          allowClear
          style={{ marginBottom: 16, width: 200, marginLeft: 12 }}
          options={Object.entries(statusConfig).map(([key, val]) => ({
            value: key,
            label: val.label,
          }))}
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
            pageSize: pageSize,
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
