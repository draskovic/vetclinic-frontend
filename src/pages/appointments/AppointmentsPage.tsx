import { useState, useDeferredValue } from 'react';
import { Table, Button, Space, Input, Card, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { appointmentsApi } from '@/api/appointments';
import type { Appointment, AppointmentStatus, AppointmentType } from '@/types';
import dayjs from 'dayjs';
import AppointmentModal from './AppointmentModal';

const { Title } = Typography;

const statusConfig: Record<AppointmentStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Zakazan', color: '#1890ff' },
  CONFIRMED: { label: 'Potvrđen', color: '#13c2c2' },
  IN_PROGRESS: { label: 'U toku', color: '#fa8c16' },
  COMPLETED: { label: 'Završen', color: '#52c41a' },
  CANCELLED: { label: 'Otkazan', color: '#ff4d4f' },
  NO_SHOW: { label: 'Nije došao', color: '#8c8c8c' },
};

const typeConfig: Record<AppointmentType, string> = {
  CHECKUP: 'Pregled',
  VACCINATION: 'Vakcinacija',
  SURGERY: 'Operacija',
  EMERGENCY: 'Hitno',
  FOLLOW_UP: 'Kontrola',
  GROOMING: 'Šišanje',
};

export default function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const isSearching = deferredSearch.trim().length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const queryClient = useQueryClient();

  // When searching, load all data (size=1000) so client-side filter works across all appointments
  // When not searching, paginate normally (10 per page)
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', isSearching ? 'search' : page],
    queryFn: () =>
      isSearching
        ? appointmentsApi.getAll(0, 1000).then((r) => r.data)
        : appointmentsApi.getAll(page - 1, 10).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      message.success('Termin je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = isSearching
    ? data?.content.filter(
        (a) =>
          a.petName.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          a.ownerName.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          a.vetName.toLowerCase().includes(deferredSearch.toLowerCase()),
      )
    : data?.content;

  const columns: ColumnsType<Appointment> = [
    {
      title: 'Datum i vreme',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (val) => dayjs(val).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix(),
      defaultSortOrder: 'descend',
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
    },
    {
      title: 'Veterinar',
      dataIndex: 'vetName',
      key: 'vetName',
    },
    {
      title: 'Tip',
      dataIndex: 'type',
      key: 'type',
      render: (type: AppointmentType) => typeConfig[type] ?? type,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: AppointmentStatus) => {
        const config = statusConfig[status];
        return (
          <span
            style={{
              color: config.color === 'default' ? '#8c8c8c' : config.color,
              fontWeight: 600,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      title: 'Lokacija',
      dataIndex: 'locationName',
      key: 'locationName',
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
              setEditingAppointment(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje termina'
            description='Da li ste sigurni da želite da obrišete ovaj termin?'
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
          Termini
        </Title>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingAppointment(null);
            setModalOpen(true);
          }}
        >
          Zakaži termin
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Pretraži po ljubimcu, vlasniku ili veterinaru...'
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
          dataSource={filteredData}
          rowKey='id'
          loading={isLoading}
          pagination={
            isSearching
              ? {
                  pageSize: 10,
                  showTotal: (total) => `Pronađeno: ${total} termina`,
                }
              : {
                  current: page,
                  total: data?.totalElements,
                  pageSize: 10,
                  onChange: setPage,
                  showTotal: (total) => `Ukupno: ${total} termina`,
                }
          }
        />
      </Card>

      <AppointmentModal
        open={modalOpen}
        appointment={editingAppointment}
        onClose={() => {
          setModalOpen(false);
          setEditingAppointment(null);
        }}
      />
    </div>
  );
}
