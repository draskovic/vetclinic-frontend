import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Card,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Select,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { appointmentsApi } from '@/api/appointments';
import type { Appointment, AppointmentStatus, AppointmentType, MedicalRecord } from '@/types';
import dayjs from 'dayjs';
import AppointmentModal from './AppointmentModal';
import {} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import MedicalRecordModal from '../medical-records/MedicalRecordModal';
import { medicalRecordsApi } from '@/api/medical-records';
import { useSearchParams } from 'react-router-dom';

const { Title } = Typography;

const statusConfig: Record<AppointmentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Na čekanju', color: '#faad14' },
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
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const debouncedSearch = useDebouncedValue(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [medRecordModalOpen, setMedRecordModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [startedRecord, setStartedRecord] = useState<MedicalRecord | null>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  const startMutation = useMutation({
    mutationFn: (appointmentId: string) => medicalRecordsApi.startFromAppointment(appointmentId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setSelectedAppointment(null);
      setStartedRecord(response.data);
      setMedRecordModalOpen(true);
    },
    onError: () => message.error('Greška pri pokretanju intervencije!'),
  });

  // When searching, load all data (size=1000) so client-side filter works across all appointments
  // When not searching, paginate normally (10 per page)
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, pageSize, debouncedSearch, statusFilter],
    queryFn: () =>
      appointmentsApi
        .getAll(page - 1, pageSize, 'startTime,desc', debouncedSearch, statusFilter)
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      message.success('Termin je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const filteredData = data?.content;

  const handleApprove = async (id: string) => {
    try {
      await appointmentsApi.approve(id);
      message.success('Termin je potvrđen');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch {
      message.error('Greška pri potvrdi termina');
    }
  };

  const handleReject = async (id: string) => {
    Modal.confirm({
      title: 'Odbij termin',
      content: 'Da li ste sigurni da želite da odbijete ovaj termin?',
      okText: 'Da, odbij',
      okType: 'danger',
      cancelText: 'Otkaži',
      onOk: async () => {
        try {
          await appointmentsApi.reject(id);
          message.success('Termin je odbijen');
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch {
          message.error('Greška pri odbijanju termina');
        }
      },
    });
  };

  const columns: ColumnsType<Appointment> = [
    {
      title: 'Datum i vreme',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (val) => dayjs(val).format('DD.MM.YYYY HH:mm'),
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
      title: 'Razlog',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
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
      width: 160,
      render: (_, record) => (
        <Space>
          {(record.status === 'SCHEDULED' || record.status === 'CONFIRMED') && (
            <Tooltip title='Pokreni intervenciju'>
              <Button
                type='text'
                style={{ color: '#22c55e' }}
                icon={<PlayCircleOutlined />}
                loading={startMutation.isPending}
                onClick={() => startMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'PENDING' && (
            <>
              <Tooltip title='Potvrdi'>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', fontSize: '18px', cursor: 'pointer', marginRight: 8 }}
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
              <Tooltip title='Odbij'>
                <CloseCircleOutlined
                  style={{ color: '#ff4d4f', fontSize: '18px', cursor: 'pointer' }}
                  onClick={() => handleReject(record.id)}
                />
              </Tooltip>
            </>
          )}

          {record.status === 'IN_PROGRESS' && (
            <Tooltip title='Nastavi intervenciju'>
              <Button
                type='text'
                style={{ color: '#fa8c16' }}
                icon={<PlayCircleOutlined />}
                loading={startMutation.isPending}
                onClick={() => startMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'COMPLETED' && (
            <Tooltip title='Otvori karton'>
              <Button
                type='text'
                icon={<FolderOpenOutlined />}
                loading={startMutation.isPending}
                onClick={() => startMutation.mutate(record.id)}
              />
            </Tooltip>
          )}

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

        <Tooltip title='Kalendarski prikaz'>
          <CalendarOutlined
            style={{ fontSize: '20px', cursor: 'pointer', marginRight: '12px' }}
            onClick={() => navigate('/calendar')}
          />
        </Tooltip>

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
            showTotal: (total) => `Ukupno: ${total} termina`,
          }}
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
      <MedicalRecordModal
        open={medRecordModalOpen}
        record={startedRecord}
        onClose={() => {
          setMedRecordModalOpen(false);
          setSelectedAppointment(null);
          setStartedRecord(null);
        }}
        defaultValues={
          selectedAppointment
            ? {
                petId: selectedAppointment.petId,
                vetId: selectedAppointment.vetId,
                appointmentId: selectedAppointment.id,
                symptoms: selectedAppointment.reason || '',
              }
            : undefined
        }
      />
    </div>
  );
}
