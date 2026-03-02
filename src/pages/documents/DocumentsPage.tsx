import { useState } from 'react';
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
  Tag,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { documentsApi } from '@/api/documents';
import type { DocumentRecord, FileType } from '@/types';
import dayjs from 'dayjs';
import DocumentModal from './DocumentModal';

const { Title } = Typography;

const fileTypeConfig: Record<FileType, { label: string; color: string }> = {
  IMAGE: { label: 'Slika', color: 'blue' },
  PDF: { label: 'PDF', color: 'red' },
  LAB_RESULT: { label: 'Lab nalaz', color: 'green' },
  XRAY: { label: 'Rendgen', color: 'purple' },
  OTHER: { label: 'Ostalo', color: 'default' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'PDF':
    case 'LAB_RESULT':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    case 'IMAGE':
    case 'XRAY':
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    default:
      return <FileOutlined />;
  }
}

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page],
    queryFn: () => documentsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      message.success('Dokument je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (r) =>
          (r.fileName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.petName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.uploadedByName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<DocumentRecord> = [
    {
      title: 'Tip',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 120,
      render: (val: FileType) => {
        const cfg = fileTypeConfig[val];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
      filters: Object.entries(fileTypeConfig).map(([value, cfg]) => ({
        text: cfg.label,
        value,
      })),
      onFilter: (value, record) => record.fileType === value,
    },
    {
      title: 'Naziv fajla',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (val: string | null, record) => (
        <Space>
          {getFileIcon(record.fileType)}
          <span>{val ?? '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (val) => val ?? '-',
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
      key: 'petName',
      render: (val) => val ?? '-',
    },
    {
      title: 'Uploadovao',
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      render: (val) => val ?? '-',
    },
    {
      title: 'Veličina',
      dataIndex: 'fileSizeBytes',
      key: 'fileSizeBytes',
      width: 100,
      render: (val: number | null) => formatFileSize(val),
    },
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Fajl',
      key: 'file',
      width: 60,
      align: 'center',
      render: (_, record) =>
        record.storagePath ? (
          <Tooltip title='Preuzmi'>{getFileIcon(record.fileType)}</Tooltip>
        ) : (
          <span style={{ color: '#d9d9d9' }}>—</span>
        ),
      onCell: (record) => ({
        onClick: async () => {
          if (!record.storagePath) return;
          try {
            const res = await documentsApi.downloadFile(record.id);
            const blob = new Blob([res.data], {
              type: record.mimeType ?? 'application/octet-stream',
            });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          } catch {
            message.error('Greška pri preuzimanju fajla!');
          }
        },
        style: record.storagePath ? { cursor: 'pointer' } : undefined,
      }),
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
              setEditingDocument(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje dokumenta'
            description='Da li ste sigurni da želite da obrišete ovaj dokument?'
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
          Dokumenti
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingDocument(null);
            setModalOpen(true);
          }}
        >
          Novi dokument
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po nazivu fajla, ljubimcu, opisu...'
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
            showTotal: (total) => `Ukupno: ${total} dokumenata`,
          }}
        />
      </Card>

      <DocumentModal
        open={modalOpen}
        document={editingDocument}
        onClose={() => {
          setModalOpen(false);
          setEditingDocument(null);
        }}
      />
    </div>
  );
}
