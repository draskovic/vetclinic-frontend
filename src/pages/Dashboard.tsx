import { useState } from 'react';
import { Card, Col, Row, Typography, Table, Tag, Empty, Button, Space, Tooltip } from 'antd';
import {
  WarningOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  UserAddOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { appointmentsApi } from '@/api/appointments';
import { medicalRecordsApi } from '@/api/medical-records';
import { vaccinationsApi } from '@/api/vaccinations';
import { invoicesApi } from '@/api/invoices';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate, Link } from 'react-router-dom';
import NewPatientModal from '@/components/NewPatientModal';
import MedicalRecordModal from './medical-records/MedicalRecordModal';

import type {
  Appointment,
  Vaccination,
  AppointmentStatus,
  Invoice,
  InvoiceStatus,
  MedicalRecord,
} from '@/types';

const { Title, Text } = Typography;

const statusConfig: Record<AppointmentStatus, { color: string; label: string }> = {
  SCHEDULED: { color: 'blue', label: 'Zakazan' },
  CONFIRMED: { color: 'cyan', label: 'Potvrđen' },
  IN_PROGRESS: { color: 'orange', label: 'U toku' },
  COMPLETED: { color: 'green', label: 'Završen' },
  CANCELLED: { color: 'red', label: 'Otkazan' },
  NO_SHOW: { color: 'default', label: 'Nije došao' },
};

const invoiceStatusConfig: Record<string, { color: string; label: string }> = {
  ISSUED: { color: 'blue', label: 'Izdata' },
  PARTIALLY_PAID: { color: 'orange', label: 'Delimično' },
  OVERDUE: { color: 'red', label: 'Zakasnela' },
};

const getStatCards = (dark: boolean) => [
  {
    key: 'appointments',
    title: 'Termini danas',
    icon: <CalendarOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #1a2e22 0%, #1e4a30 100%)'
      : 'linear-gradient(135deg, #e8faf0 0%, #d0f0e0 100%)',
    iconBg: '#22c55e',
    lg: 5,
    valueFontSize: 32,
  },
  {
    key: 'upcoming',
    title: 'Predstojeći termini (7d)',
    icon: <ClockCircleOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #1a2332 0%, #1e3a5f 100%)'
      : 'linear-gradient(135deg, #e8f4fd 0%, #d0e8fa 100%)',
    iconBg: '#3b82f6',
    lg: 6,
    valueFontSize: 32,
  },
  {
    key: 'unpaid',
    title: 'Neplaćene fakture',
    icon: <WarningOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #2e1a1a 0%, #4a1e1e 100%)'
      : 'linear-gradient(135deg, #fde8e8 0%, #f5d0d0 100%)',
    iconBg: '#ef4444',
    lg: 6,
    valueFontSize: 32,
  },
  {
    key: 'revenue',
    title: 'Prihod ovog meseca',
    icon: <DollarOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #2e2a1a 0%, #4a3a1e 100%)'
      : 'linear-gradient(135deg, #fef6e8 0%, #faecd0 100%)',
    iconBg: '#f59e0b',
    lg: 7,
    valueFontSize: 24,
  },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const { darkMode } = useThemeStore();
  const statCards = getStatCards(darkMode);
  const navigate = useNavigate();
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);
  const [medicalRecordModalOpen, setMedicalRecordModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const todayFrom = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
  const todayTo = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ssZ');

  const tomorrowFrom = dayjs().add(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
  const weekTo = dayjs().add(7, 'day').endOf('day').format('YYYY-MM-DDTHH:mm:ssZ');

  const { data: todayAppointments } = useQuery({
    queryKey: ['dashboard-appointments', todayFrom],
    queryFn: () => appointmentsApi.getByDateRange(todayFrom, todayTo).then((r) => r.data),
  });

  const { data: upcomingAppointments } = useQuery({
    queryKey: ['dashboard-upcoming-appointments', tomorrowFrom],
    queryFn: () => appointmentsApi.getByDateRange(tomorrowFrom, weekTo).then((r) => r.data),
  });

  const { data: issuedInvoices } = useQuery({
    queryKey: ['dashboard-invoices-issued'],
    queryFn: () => invoicesApi.getByStatus('ISSUED').then((r) => r.data),
  });

  const { data: partiallyPaidInvoices } = useQuery({
    queryKey: ['dashboard-invoices-partially-paid'],
    queryFn: () => invoicesApi.getByStatus('PARTIALLY_PAID').then((r) => r.data),
  });

  const { data: overdueInvoices } = useQuery({
    queryKey: ['dashboard-invoices-overdue'],
    queryFn: () => invoicesApi.getByStatus('OVERDUE').then((r) => r.data),
  });

  const { data: dueVaccinations } = useQuery({
    queryKey: ['dashboard-vaccinations'],
    queryFn: () =>
      vaccinationsApi.getDue(dayjs().add(7, 'day').format('YYYY-MM-DD')).then((r) => r.data),
  });

  const { data: paidInvoices } = useQuery({
    queryKey: ['dashboard-invoices-paid'],
    queryFn: () => invoicesApi.getByStatus('PAID').then((r) => r.data),
  });

  const { data: recentRecords } = useQuery({
    queryKey: ['dashboard-recent-records'],
    queryFn: () => medicalRecordsApi.getAll(0, 5).then((r) => r.data),
  });

  const monthlyRevenue =
    paidInvoices
      ?.filter((inv) => dayjs(inv.issuedAt).isSame(dayjs(), 'month'))
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0) ?? 0;

  const unpaidCount =
    (issuedInvoices?.length ?? 0) +
    (partiallyPaidInvoices?.length ?? 0) +
    (overdueInvoices?.length ?? 0);

  const statValues: Record<string, number> = {
    appointments: todayAppointments?.length ?? 0,
    upcoming: upcomingAppointments?.length ?? 0,
    unpaid: unpaidCount,
    revenue: monthlyRevenue,
  };

  const appointmentColumns: ColumnsType<Appointment> = [
    {
      title: 'Vreme',
      dataIndex: 'startTime',
      width: 80,
      render: (val: string) => dayjs(val).format('HH:mm'),
      sorter: (a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
    },
    {
      title: 'Tip',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => {
        const labels: Record<string, string> = {
          CHECKUP: 'Pregled',
          VACCINATION: 'Vakcinacija',
          SURGERY: 'Operacija',
          EMERGENCY: 'Hitno',
          FOLLOW_UP: 'Kontrola',
          GROOMING: 'Šišanje',
        };
        return labels[type] ?? type;
      },
    },

    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (status: AppointmentStatus) => (
        <Tag color={statusConfig[status]?.color}>{statusConfig[status]?.label ?? status}</Tag>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: unknown, record: Appointment) => (
        <Tooltip title='Kreiraj intervenciju'>
          <Button
            type='text'
            size='small'
            icon={<MedicineBoxOutlined />}
            onClick={() => {
              setSelectedAppointment(record);
              setMedicalRecordModalOpen(true);
            }}
          />
        </Tooltip>
      ),
    },
  ];
  const upcomingColumns: ColumnsType<Appointment> = [
    {
      title: 'Datum',
      dataIndex: 'startTime',
      width: 90,
      render: (val: string) => dayjs(val).format('DD.MM.'),
    },
    {
      title: 'Vreme',
      dataIndex: 'startTime',
      key: 'time',
      width: 70,
      render: (val: string) => dayjs(val).format('HH:mm'),
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (status: AppointmentStatus) => (
        <Tag color={statusConfig[status]?.color}>{statusConfig[status]?.label ?? status}</Tag>
      ),
    },
  ];

  const unpaidInvoices: Invoice[] = [
    ...(issuedInvoices ?? []),
    ...(partiallyPaidInvoices ?? []),
    ...(overdueInvoices ?? []),
  ].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix();
  });

  const unpaidInvoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Br. fakture',
      dataIndex: 'invoiceNumber',
      width: 170,
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 105,
      render: (status: InvoiceStatus) => (
        <Tag color={invoiceStatusConfig[status]?.color}>
          {invoiceStatusConfig[status]?.label ?? status}
        </Tag>
      ),
    },
    {
      title: 'Iznos',
      dataIndex: 'total',
      width: 130,
      render: (val: number) => `${val?.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD`,
    },
    {
      title: 'Rok',
      dataIndex: 'dueDate',
      width: 110,
      render: (val: string) => {
        if (!val) return '-';
        const d = dayjs(val);
        const isPast = d.isBefore(dayjs(), 'day');
        return <span style={{ color: isPast ? 'red' : undefined }}>{d.format('DD.MM.YYYY')}</span>;
      },
    },
  ];

  const recentRecordColumns: ColumnsType<MedicalRecord> = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      width: 110,
      render: (val: string) => dayjs(val).format('DD.MM.YYYY'),
    },
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
    },
    {
      title: 'Vlasnik',
      dataIndex: 'ownerName',
    },
    {
      title: 'Dijagnoza',
      dataIndex: 'diagnosis',
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: 'Veterinar',
      dataIndex: 'vetName',
    },
  ];

  const vaccinationColumns: ColumnsType<Vaccination> = [
    {
      title: 'Ljubimac',
      dataIndex: 'petName',
    },
    {
      title: 'Vakcina',
      dataIndex: 'vaccineName',
    },
    {
      title: 'Sledeća doza',
      dataIndex: 'nextDueDate',
      width: 130,
      render: (val: string) => {
        const d = dayjs(val);
        const isPast = d.isBefore(dayjs(), 'day');
        return <span style={{ color: isPast ? 'red' : 'orange' }}>{d.format('DD.MM.YYYY')}</span>;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Dobrodošli, {user?.firstName} {user?.lastName}! 👋
        </Title>
        <Text type='secondary'>Pregled stanja klinike</Text>
      </div>
      <Row style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type='primary'
            icon={<CalendarOutlined />}
            onClick={() => navigate('/appointments')}
          >
            Novi termin
          </Button>
          <Button icon={<UserAddOutlined />} onClick={() => navigate('/owners')}>
            Nov vlasnik
          </Button>
          <Button icon={<FileAddOutlined />} onClick={() => setMedicalRecordModalOpen(true)}>
            Nova intervencija
          </Button>
          <Button icon={<MedicineBoxOutlined />} onClick={() => setNewPatientModalOpen(true)}>
            Nov pacijent
          </Button>
        </Space>
      </Row>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={card.lg} key={card.key}>
            <Card
              style={{
                borderRadius: 16,
                border: 'none',
                background: card.gradient,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: `0 4px 12px ${card.iconBg}66`,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontSize: card.valueFontSize,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: darkMode ? '#fff' : 'rgba(0,0,0,0.85)',
                    }}
                  >
                    {card.key === 'revenue'
                      ? `${statValues[card.key].toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD`
                      : statValues[card.key]}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <ClockCircleOutlined style={{ color: '#3b82f6', marginRight: 8, fontSize: 18 }} />
                Današnji termini
              </span>
            }
            extra={<Link to='/appointments'>Vidi sve</Link>}
            style={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              minHeight: 320,
            }}
          >
            {(todayAppointments?.length ?? 0) > 0 ? (
              <Table
                rowKey='id'
                columns={appointmentColumns}
                dataSource={todayAppointments}
                pagination={false}
                size='small'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <Empty description='Nema zakazanih termina za danas' />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <CalendarOutlined style={{ color: '#22c55e', marginRight: 8, fontSize: 18 }} />
                Predstojeći termini (7 dana)
              </span>
            }
            extra={<Link to='/appointments'>Vidi sve</Link>}
            style={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              minHeight: 320,
            }}
          >
            {(upcomingAppointments?.length ?? 0) > 0 ? (
              <Table
                rowKey='id'
                columns={upcomingColumns}
                dataSource={upcomingAppointments}
                pagination={false}
                size='small'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <Empty description='Nema predstojecih termina u narednih 7 dana' />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#ef4444', marginRight: 8, fontSize: 18 }} />
                Neplaćene fakture
              </span>
            }
            extra={<Link to='/invoices'>Vidi sve</Link>}
            style={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              minHeight: 320,
            }}
          >
            {unpaidInvoices.length > 0 ? (
              <Table
                rowKey='id'
                columns={unpaidInvoiceColumns}
                dataSource={unpaidInvoices.slice(0, 10)}
                pagination={false}
                size='small'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <Empty description='Sve fakture su plaćene' />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <MedicineBoxOutlined style={{ color: '#22c55e', marginRight: 8, fontSize: 18 }} />
                Predstojeće vakcinacije
              </span>
            }
            extra={<Link to='/vaccinations'>Vidi sve</Link>}
            style={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              minHeight: 320,
            }}
          >
            {(dueVaccinations?.length ?? 0) > 0 ? (
              <Table
                rowKey='id'
                columns={vaccinationColumns}
                dataSource={dueVaccinations}
                pagination={false}
                size='small'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 220,
                }}
              >
                <Empty description='Nema vakcinacija u narednih 7 dana' />
              </div>
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <span>
                <MedicineBoxOutlined style={{ color: '#8b5cf6', marginRight: 8, fontSize: 18 }} />
                Nedavne intervencije
              </span>
            }
            extra={<Link to='/medical-records'>Vidi sve</Link>}
            style={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            {(recentRecords?.content?.length ?? 0) > 0 ? (
              <Table
                rowKey='id'
                columns={recentRecordColumns}
                dataSource={recentRecords?.content}
                pagination={false}
                size='small'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120,
                }}
              >
                <Empty description='Nema intervencija' />
              </div>
            )}
          </Card>
        </Col>
      </Row>
      <MedicalRecordModal
        open={medicalRecordModalOpen}
        record={null}
        onClose={() => {
          setMedicalRecordModalOpen(false);
          setSelectedAppointment(null);
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

      <NewPatientModal open={newPatientModalOpen} onClose={() => setNewPatientModalOpen(false)} />
    </div>
  );
}
