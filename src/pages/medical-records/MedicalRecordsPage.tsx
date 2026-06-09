import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Card,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  DollarOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { medicalRecordsApi } from '@/api/medical-records';
import dayjs from 'dayjs';
import MedicalRecordModal from './MedicalRecordModal';
import MedicalRecordEditor from './MedicalRecordEditor';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchFromUrl } from '@/hooks/useSearchFromUrl';
import InvoiceModal from '../invoices/InvoiceModal';
import { invoiceStatusConfig } from '@/constants/invoiceStatus';
import { invoicesApi } from '@/api';
import { ownersApi } from '@/api/owners';
import type { MedicalRecord, Invoice } from '@/types';
import { useAuthStore } from '@/store/authStore';

const { Title } = Typography;

export default function MedicalRecordsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useSearchFromUrl();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { user } = useAuthStore();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>(undefined);
  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 300);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceDefaults, setInvoiceDefaults] = useState<
    { ownerId?: string; medicalRecordId?: string } | undefined
  >(undefined);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: ownersData } = useQuery({
    queryKey: ['owners-search', debouncedOwnerSearch],
    queryFn: () => ownersApi.getAll(0, 20, debouncedOwnerSearch || undefined).then((r) => r.data),
  });
  const filterParams = useMemo(() => {
    const ownerPart = selectedOwnerId ? { ownerId: selectedOwnerId } : {};
    const now = dayjs();
    switch (activeFilter) {
      case 'today':
        return {
          ...ownerPart,
          dateFrom: now.startOf('day').toISOString(),
          dateTo: now.endOf('day').toISOString(),
        };
      case 'week':
        return {
          ...ownerPart,
          dateFrom: now.startOf('week').toISOString(),
          dateTo: now.endOf('week').toISOString(),
        };
      case 'mine':
        return { ...ownerPart, vetId: user?.id };
      default:
        return ownerPart;
    }
  }, [activeFilter, user?.id, selectedOwnerId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, selectedOwnerId]);

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', page, pageSize, debouncedSearch, activeFilter, selectedOwnerId],
    queryFn: () =>
      medicalRecordsApi
        .getAll(page - 1, pageSize, debouncedSearch, filterParams)
        .then((r) => r.data),
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
      width: 100,
      render: (val: string | null) => val || '—',
    },

    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
      key: 'petName',
      width: 100,
      render: (val: string, record) => (
        <Space size={4}>
          {record.hasActiveAlerts && (
            <Tooltip title='Ovaj ljubimac ima aktivna zdravstvena upozorenja (alergije, hronične bolesti…)'>
              <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          <a onClick={() => navigate(`/pets/${record.petId}`)}>{val}</a>
        </Space>
      ),
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 180,
      render: (val: string) => val || '—',
    },

    {
      title: 'Dijagnoza',
      dataIndex: 'diagnoses',
      key: 'diagnoses',
      width: 100,
      ellipsis: { showTitle: false },
      render: (_val, record) => {
        const text = record.diagnoses?.map((d) => d.name).join(', ') || '-';
        return (
          <Tooltip title={text} placement='topLeft'>
            <span>{text}</span>
          </Tooltip>
        );
      },
    },

    {
      title: 'Simptomi',
      dataIndex: 'symptoms',
      key: 'symptoms',
      width: 170,
      ellipsis: { showTitle: false },
      render: (val: string | null) => {
        const text = val ?? '-';
        return (
          <Tooltip title={text} placement='topLeft'>
            <span>{text}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Kontrola',
      key: 'followUp',
      width: 95,
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
      title: 'Veterinar',
      dataIndex: 'vetName',
      key: 'vetName',
      width: 150,
    },
    {
      title: 'Faktura',
      key: 'invoice',
      width: 180,
      fixed: 'right',
      render: (_, record) =>
        record.invoiceStatus ? (
          <Space size={6}>
            <span>
              {record.invoiceTotal != null
                ? `${Number(record.invoiceTotal).toLocaleString('sr-RS', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} RSD`
                : '—'}
            </span>
            <span
              style={{ color: invoiceStatusConfig[record.invoiceStatus].color, fontWeight: 600 }}
            >
              {invoiceStatusConfig[record.invoiceStatus].label}
            </span>
          </Space>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        ),
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={3}>
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder='Pretraži po ljubimcu, veterinaru, dijagnozi, simptomu...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 400, flex: 1 }}
            allowClear
          />
          <Select
            showSearch
            allowClear
            placeholder='Filtriraj po vlasniku'
            value={selectedOwnerId}
            onChange={(val) => setSelectedOwnerId(val)}
            onSearch={setOwnerSearch}
            onInputKeyDown={(e) => {
              if (e.key === ' ') e.stopPropagation();
            }}
            filterOption={false}
            style={{ minWidth: 280 }}
            options={ownersData?.content?.map((o) => ({
              value: o.id,
              label: (
                <span>
                  {o.firstName} {o.lastName}
                  <span style={{ color: '#8c8c8c', marginLeft: 8 }}>· {o.phone}</span>
                </span>
              ),
            }))}
            notFoundContent={debouncedOwnerSearch ? 'Nema rezultata' : 'Počni kucanje...'}
          />
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Sve' },
            { key: 'today', label: 'Danas' },
            { key: 'week', label: 'Ova nedelja' },
            { key: 'mine', label: 'Moji pacijenti' },
          ].map((chip) => (
            <Button
              key={chip.key}
              type={activeFilter === chip.key ? 'primary' : 'default'}
              size='small'
              onClick={() => setActiveFilter(chip.key)}
              style={{ borderRadius: 16 }}
            >
              {chip.label}
            </Button>
          ))}
        </div>

        <Table
          scroll={{ x: 1320 }}
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={data?.content}
          rowKey='id'
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandedRowRender: (record) => (
              <MedicalRecordEditor
                key={record.id}
                record={record}
                compact
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ['medical-records'] });
                  setExpandedRowKeys((prev) => prev.filter((k) => k !== record.id));
                }}
              />
            ),
            rowExpandable: () => true,
          }}
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
      {modalOpen && (
        <MedicalRecordModal
          open={modalOpen}
          record={editingRecord}
          onClose={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
        />
      )}
      {invoiceModalOpen && (
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
      )}
    </div>
  );
}
