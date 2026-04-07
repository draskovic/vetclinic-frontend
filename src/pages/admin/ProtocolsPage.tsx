import { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Popconfirm, message, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treatmentProtocolsApi } from '@/api';
import type { TreatmentProtocol } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import ProtocolModal from './ProtocolModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function ProtocolsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TreatmentProtocol | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['treatment-protocols', page, pageSize, debouncedSearch],
    queryFn: () => treatmentProtocolsApi.getAll(page - 1, pageSize, debouncedSearch || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentProtocolsApi.remove(id),
    onSuccess: () => {
      message.success('Protokol je obrisan');
      queryClient.invalidateQueries({ queryKey: ['treatment-protocols'] });
    },
    onError: () => message.error('Greška pri brisanju'),
  });

  const columns: ColumnsType<TreatmentProtocol> = [
    {
      title: 'Naziv',
      dataIndex: 'name',
    },
    {
      title: 'Dijagnoza',
      dataIndex: 'diagnosisName',
      render: (val: string | null) => val || '—',
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      ellipsis: true,
      render: (val: string | null) => val || '—',
    },
    {
      title: 'Aktivan',
      dataIndex: 'active',
      width: 90,
      align: 'center',
      render: (val: boolean) => <Tag color={val ? 'green' : 'default'}>{val ? 'Da' : 'Ne'}</Tag>,
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
            title='Obrisati protokol?'
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
        Protokoli terapije
      </Typography.Title>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input
          placeholder='Pretraga po nazivu...'
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 350 }}
          allowClear
        />
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Novi protokol
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

      <ProtocolModal
        open={modalOpen}
        protocol={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
