import { useState } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { medicalRecordsApi } from '@/api/medical-records';
import type { MedicalRecord } from '@/types';
import dayjs from 'dayjs';
import MedicalRecordModal from './MedicalRecordModal';

const { Title } = Typography;

export default function MedicalRecordsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', page],
    queryFn: () => medicalRecordsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicalRecordsApi.delete(id),
    onSuccess: () => {
      message.success('Intervencija je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = search
    ? data?.content.filter(
        (r) =>
          r.petName.toLowerCase().includes(search.toLowerCase()) ||
          r.vetName.toLowerCase().includes(search.toLowerCase()) ||
          (r.symptoms ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (r.diagnosis ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<MedicalRecord> = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => dayjs(val).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
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
      width: 120,
      render: (_, record) => (
        <Space>
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
    </div>
  );
}
