import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message, Tooltip } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { medicalRecordsApi } from '@/api/medical-records';
import dayjs from 'dayjs';
import MedicalRecordModal from './MedicalRecordModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import InvoiceModal from '../invoices/InvoiceModal';
import { invoicesApi } from '@/api';
import type { MedicalRecord, Invoice } from '@/types';

const { Title } = Typography;

export default function MedicalRecordsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceDefaults, setInvoiceDefaults] = useState<
    { ownerId?: string; medicalRecordId?: string } | undefined
  >(undefined);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search, 300);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', page, pageSize, debouncedSearch],
    queryFn: () =>
      medicalRecordsApi.getAll(page - 1, pageSize, debouncedSearch).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicalRecordsApi.delete(id),
    onSuccess: () => {
      message.success('Intervencija je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const handleDownloadPdf = async (id: string, _petName: string) => {
    try {
      const response = await medicalRecordsApi.downloadPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.error('Greška pri preuzimanju PDF-a');
    }
  };

  const columns: ColumnsType<MedicalRecord> = [
    {
      title: 'Šifra',
      dataIndex: 'recordCode',
      key: 'recordCode',
      render: (val: string | null) => val || '—',
    },

    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
      key: 'petName',
    },
    {
      title: 'Veterinar',
      dataIndex: 'vetName',
      key: 'vetName',
    },
    {
      title: 'Dijagnoza',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (val) => val ?? '-',
      ellipsis: true,
    },
    {
      title: 'Simptomi',
      dataIndex: 'symptoms',
      key: 'symptoms',
      render: (val) => val ?? '-',
      ellipsis: true,
    },
    {
      title: 'Kontrola',
      key: 'followUp',
      render: (_, record) =>
        record.followUpRecommended ? (
          <span style={{ color: '#fa8c16', fontWeight: 600 }}>
            Da ({dayjs(record.followUpDate).format('DD.MM.YYYY')})
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>Ne</span>
        ),
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title='Preuzmi PDF'>
            <Button
              type='text'
              icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => handleDownloadPdf(record.id, record.petName)}
            />
          </Tooltip>

          <Tooltip title='Faktura'>
            <Button
              type='text'
              icon={<DollarOutlined style={{ color: '#52c41a' }} />}
              onClick={async () => {
                try {
                  const res = await invoicesApi.getByMedicalRecord(record.id);
                  setExistingInvoice(res.data);
                  setInvoiceDefaults(undefined);
                } catch {
                  setExistingInvoice(null);
                  setInvoiceDefaults({ ownerId: record.ownerId, medicalRecordId: record.id });
                }
                setInvoiceModalOpen(true);
              }}
            />
          </Tooltip>

          <Button
            type='text'
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje intervencije'
            description='Da li ste sigurni da želite da obrišete ovau intervenciju?'
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
          Intervencije
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
        >
          Nova intervencija
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po ljubimcu, veterinaru, dijagnozi, simptomu...'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />

        <Table
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={data?.content}
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
            showTotal: (total) => `Ukupno: ${total} intervencija`,
          }}
        />
      </Card>

      <MedicalRecordModal
        open={modalOpen}
        record={editingRecord}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
      />
      <InvoiceModal
        open={invoiceModalOpen}
        invoice={existingInvoice}
        onClose={() => {
          setInvoiceModalOpen(false);
          setInvoiceDefaults(undefined);
          setExistingInvoice(null);
        }}
        defaultValues={invoiceDefaults}
      />
    </div>
  );
}
