import { Card, Col, Row, Typography, Table, Tag, Empty } from 'antd';
import {
  TeamOutlined,
  HeartOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { ownersApi } from '@/api/owners';
import { petsApi } from '@/api/pets';
import { appointmentsApi } from '@/api/appointments';
import { vaccinationsApi } from '@/api/vaccinations';
import { invoicesApi } from '@/api/invoices';
import type { Appointment, Vaccination, AppointmentStatus } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/themeStore';

const { Title, Text } = Typography;

const statusConfig: Record<AppointmentStatus, { color: string; label: string }> = {
  SCHEDULED: { color: 'blue', label: 'Zakazan' },
  CONFIRMED: { color: 'cyan', label: 'Potvrđen' },
  IN_PROGRESS: { color: 'orange', label: 'U toku' },
  COMPLETED: { color: 'green', label: 'Završen' },
  CANCELLED: { color: 'red', label: 'Otkazan' },
  NO_SHOW: { color: 'default', label: 'Nije došao' },
};

const getStatCards = (dark: boolean) => [
  {
    key: 'owners',
    title: 'Ukupno vlasnika',
    icon: <TeamOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #1a2332 0%, #1e3a5f 100%)'
      : 'linear-gradient(135deg, #e8f4fd 0%, #d0e8fa 100%)',
    iconBg: '#3b82f6',
  },
  {
    key: 'pets',
    title: 'Ukupno ljubimaca',
    icon: <HeartOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #2a1a2e 0%, #4a2040 100%)'
      : 'linear-gradient(135deg, #fce8f3 0%, #f5d0e5 100%)',
    iconBg: '#ec4899',
  },
  {
    key: 'appointments',
    title: 'Termini danas',
    icon: <CalendarOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #1a2e22 0%, #1e4a30 100%)'
      : 'linear-gradient(135deg, #e8faf0 0%, #d0f0e0 100%)',
    iconBg: '#22c55e',
  },
  {
    key: 'revenue',
    title: 'Prihod ovog meseca',
    icon: <DollarOutlined />,
    gradient: dark
      ? 'linear-gradient(135deg, #2e2a1a 0%, #4a3a1e 100%)'
      : 'linear-gradient(135deg, #fef6e8 0%, #faecd0 100%)',
    iconBg: '#f59e0b',
  },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const { darkMode } = useThemeStore();
  const statCards = getStatCards(darkMode);

  const todayFrom = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
  const todayTo = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ssZ');

  const { data: ownersData } = useQuery({
    queryKey: ['dashboard-owners'],
    queryFn: () => ownersApi.getAll(0, 1).then((r) => r.data),
  });

  const { data: petsData } = useQuery({
    queryKey: ['dashboard-pets'],
    queryFn: () => petsApi.getAll(0, 1).then((r) => r.data),
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ['dashboard-appointments', todayFrom],
    queryFn: () => appointmentsApi.getByDateRange(todayFrom, todayTo).then((r) => r.data),
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

  const monthlyRevenue =
    paidInvoices
      ?.filter((inv) => dayjs(inv.issuedAt).isSame(dayjs(), 'month'))
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0) ?? 0;

  const statValues: Record<string, number> = {
    owners: ownersData?.totalElements ?? 0,
    pets: petsData?.totalElements ?? 0,
    appointments: todayAppointments?.length ?? 0,
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

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
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
                      fontSize: 32,
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
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <ClockCircleOutlined style={{ color: '#3b82f6', marginRight: 8, fontSize: 18 }} />
                Današnji termini
              </span>
            }
            extra={<a href='/appointments'>Vidi sve</a>}
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
        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <MedicineBoxOutlined style={{ color: '#22c55e', marginRight: 8, fontSize: 18 }} />
                Predstojeće vakcinacije
              </span>
            }
            extra={<a href='/vaccinations'>Vidi sve</a>}
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
    </div>
  );
}
