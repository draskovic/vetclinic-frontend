import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message, Tooltip } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { labReportsApi } from '@/api/lab-reports';
import type { LabReport, LabReportStatus } from '@/types';
import dayjs from 'dayjs';
import LabReportModal from './LabReportModal';

const { Title } = Typography;

const statusConfig: Record<LabReportStatus, { label: string; color: string }> = {
  PENDING: { label: 'Na čekanju', color: '#1890ff' },
  COMPLETED: { label: 'Završen', color: '#52c41a' },
  CANCELLED: { label: 'Otkazan', color: '#ff4d4f' },
};

export default function LabReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lab-reports', page],
    queryFn: () => labReportsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => labReportsApi.delete(id),
    onSuccess: () => {
      message.success('Lab izveštaj je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (r) =>
          r.reportNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.analysisType.toLowerCase().includes(search.toLowerCase()) ||
          r.petName.toLowerCase().includes(search.toLowerCase()) ||
          (r.ownerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          r.vetName.toLowerCase().includes(search.toLowerCase()) ||
          (r.laboratoryName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<LabReport> = [
    {
      title: 'Broj izveštaja',
      dataIndex: 'reportNumber',
      key: 'reportNumber',
    },
    {
      title: 'Vrsta analize',
      dataIndex: 'analysisType',
      key: 'analysisType',
    },
    {
      title: 'Kategorija',
      dataIndex: 'testCategory',
      key: 'testCategory',
      render: (val: string) => (
        <span style={{ color: val === 'RAPID_TEST' ? '#fa8c16' : '#13c2c2', fontWeight: 600 }}>
          {val === 'RAPID_TEST' ? 'Brzi test' : 'Laboratorijski'}
        </span>
      ),
      filters: [
        { text: 'Laboratorijski', value: 'LABORATORY' },
        { text: 'Brzi test', value: 'RAPID_TEST' },
      ],
      onFilter: (value, record) => record.testCategory === value,
    },

    {
      title: 'Ljubimac',
      dataIndex: 'petName',
      key: 'petName',
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
      key: 'ownerName',
      render: (val) => val ?? '-',
    },

    {
      title: 'Veterinar',
      dataIndex: 'vetName',
      key: 'vetName',
    },
    {
      title: 'Laboratorija',
      dataIndex: 'laboratoryName',
      key: 'laboratoryName',
      render: (val) => val ?? '-',
    },
    {
      title: 'Datum zahteva',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.requestedAt).unix() - dayjs(b.requestedAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: LabReportStatus) => {
        const cfg = statusConfig[status];
        return <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>;
      },
    },
    {
      title: 'Nalaz',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      render: (val: boolean) =>
        val ? (
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Nenormalan</span>
        ) : (
          <span style={{ color: '#52c41a' }}>U redu</span>
        ),
    },
    {
      title: 'PDF',
      key: 'pdf',
      width: 60,
      align: 'center',
      render: (_, record) =>
        record.fileName ? (
          <Tooltip title={record.fileName}>
            <FilePdfOutlined
              style={{ color: '#ff4d4f', fontSize: 20, cursor: 'pointer' }}
              onClick={async () => {
                try {
                  const res = await labReportsApi.downloadFile(record.id);
                  const blob = new Blob([res.data], { type: record.mimeType ?? 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch {
                  message.error('Greška pri preuzimanju fajla!');
                }
              }}
            />
          </Tooltip>
        ) : (
          <span style={{ color: '#d9d9d9' }}>—</span>
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
              setEditingReport(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje izveštaja'
            description='Da li ste sigurni da želite da obrišete ovaj izveštaj?'
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
          Lab izveštaji
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingReport(null);
            setModalOpen(true);
          }}
        >
          Novi izveštaj
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po broju, analizi, ljubimcu, veterinaru ili laboratoriji...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 500 }}
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
            showTotal: (total) => `Ukupno: ${total} izveštaja`,
          }}
        />
      </Card>

      <LabReportModal
        open={modalOpen}
        labReport={editingReport}
        onClose={() => {
          setModalOpen(false);
          setEditingReport(null);
        }}
      />
    </div>
  );
}
