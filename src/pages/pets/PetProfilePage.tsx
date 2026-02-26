import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Tabs, Table, Tag, Descriptions, Spin, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { petsApi } from '@/api/pets';
import { appointmentsApi } from '@/api/appointments';
import { medicalRecordsApi } from '@/api/medical-records';
import { vaccinationsApi } from '@/api/vaccinations';
import { labReportsApi } from '@/api/lab-reports';
import type { Appointment, MedicalRecord, Vaccination, LabReport } from '@/types';

const { Title } = Typography;

const appointmentTypeLabel: Record<string, string> = {
  CHECKUP: 'Pregled',
  VACCINATION: 'Vakcinacija',
  SURGERY: 'Operacija',
  EMERGENCY: 'Hitno',
  FOLLOW_UP: 'Kontrola',
  GROOMING: 'Šišanje',
};
const appointmentStatusColor: Record<string, string> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'cyan',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'default',
};
const appointmentStatusLabel: Record<string, string> = {
  SCHEDULED: 'Zakazan',
  CONFIRMED: 'Potvrđen',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završen',
  CANCELLED: 'Otkazan',
  NO_SHOW: 'Nije došao',
};
const genderLabel: Record<string, string> = {
  MALE: 'Muški',
  FEMALE: 'Ženski',
  UNKNOWN: 'Nepoznat',
};
const labStatusColor: Record<string, string> = {
  PENDING: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};
const labStatusLabel: Record<string, string> = {
  PENDING: 'Na čekanju',
  COMPLETED: 'Završen',
  CANCELLED: 'Otkazan',
};

const getVaccinationStatus = (nextDueDate: string | null) => {
  if (!nextDueDate) return null;
  const today = dayjs();
  const due = dayjs(nextDueDate);
  if (due.isBefore(today)) return { color: 'red', label: 'Istekla' };
  if (due.diff(today, 'day') <= 30) return { color: 'orange', label: 'Uskoro' };
  return { color: 'green', label: 'Aktivna' };
};

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();

  const { data: pet, isLoading: petLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsApi.getById(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const { data: appointments = [], isLoading: apptLoading } = useQuery({
    queryKey: ['appointments', 'by-pet', petId],
    queryFn: () => appointmentsApi.getByPet(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const { data: medicalRecords = [], isLoading: mrLoading } = useQuery({
    queryKey: ['medical-records', 'by-pet', petId],
    queryFn: () => medicalRecordsApi.getByPet(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const { data: vaccinations = [], isLoading: vacLoading } = useQuery({
    queryKey: ['vaccinations', 'by-pet', petId],
    queryFn: () => vaccinationsApi.getByPet(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const { data: labReports = [], isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports', 'by-pet', petId],
    queryFn: () => labReportsApi.getByPet(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const appointmentColumns: ColumnsType<Appointment> = [
    {
      title: 'Datum i vreme',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    { title: 'Veterinar', dataIndex: 'vetName', key: 'vetName' },
    {
      title: 'Tip',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => appointmentTypeLabel[v] ?? v,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={appointmentStatusColor[v]}>{appointmentStatusLabel[v]}</Tag>
      ),
    },
    {
      title: 'Razlog',
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string | null) => v ?? '-',
    },
  ];

  const medicalRecordColumns: ColumnsType<MedicalRecord> = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
    },
    { title: 'Veterinar', dataIndex: 'vetName', key: 'vetName' },
    {
      title: 'Dijagnoza',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Simptomi',
      dataIndex: 'symptoms',
      key: 'symptoms',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Kontrola',
      key: 'followUp',
      render: (_: unknown, record: MedicalRecord) =>
        record.followUpRecommended && record.followUpDate
          ? dayjs(record.followUpDate).format('DD.MM.YYYY')
          : '-',
    },
  ];

  const vaccinationColumns: ColumnsType<Vaccination> = [
    {
      title: 'Datum',
      dataIndex: 'administeredAt',
      key: 'administeredAt',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
    },
    { title: 'Vakcina', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: 'Proizvođač',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Sledeća doza',
      dataIndex: 'nextDueDate',
      key: 'nextDueDate',
      render: (v: string | null) => {
        if (!v) return '-';
        const status = getVaccinationStatus(v);
        return status ? (
          <Tag color={status.color}>{dayjs(v).format('DD.MM.YYYY')}</Tag>
        ) : (
          dayjs(v).format('DD.MM.YYYY')
        );
      },
    },
    {
      title: 'Status',
      key: 'vacStatus',
      render: (_: unknown, record: Vaccination) => {
        const status = getVaccinationStatus(record.nextDueDate);
        return status ? <Tag color={status.color}>{status.label}</Tag> : '-';
      },
    },
  ];

  const labReportColumns: ColumnsType<LabReport> = [
    { title: 'Broj izveštaja', dataIndex: 'reportNumber', key: 'reportNumber' },
    { title: 'Vrsta analize', dataIndex: 'analysisType', key: 'analysisType' },
    {
      title: 'Laboratorija',
      dataIndex: 'laboratoryName',
      key: 'laboratoryName',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Datum',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={labStatusColor[v]}>{labStatusLabel[v]}</Tag>,
    },
    {
      title: 'Nalaz',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      render: (v: boolean) =>
        v ? <Tag color='red'>Nenormalan</Tag> : <Tag color='green'>U redu</Tag>,
    },
  ];

  if (petLoading) return <Spin size='large' style={{ display: 'block', marginTop: 80 }} />;
  if (!pet) return null;

  const tabItems = [
    {
      key: 'appointments',
      label: `Termini (${appointments.length})`,
      children: (
        <Table
          dataSource={appointments}
          columns={appointmentColumns}
          rowKey='id'
          loading={apptLoading}
          pagination={{ pageSize: 10 }}
          size='small'
        />
      ),
    },
    {
      key: 'medical-records',
      label: `Medicinski kartoni (${medicalRecords.length})`,
      children: (
        <Table
          dataSource={medicalRecords}
          columns={medicalRecordColumns}
          rowKey='id'
          loading={mrLoading}
          pagination={{ pageSize: 10 }}
          size='small'
        />
      ),
    },
    {
      key: 'vaccinations',
      label: `Vakcinacije (${vaccinations.length})`,
      children: (
        <Table
          dataSource={vaccinations}
          columns={vaccinationColumns}
          rowKey='id'
          loading={vacLoading}
          pagination={{ pageSize: 10 }}
          size='small'
        />
      ),
    },
    {
      key: 'lab-reports',
      label: `Lab izveštaji (${labReports.length})`,
      children: (
        <Table
          dataSource={labReports}
          columns={labReportColumns}
          rowKey='id'
          loading={labLoading}
          pagination={{ pageSize: 10 }}
          size='small'
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pets')}>
          Nazad na ljubimce
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                {pet.name}
              </Title>
              {pet.isDeceased && <Tag color='red'>Preminuo/la</Tag>}
            </Space>
          }
          bordered
          column={3}
        >
          <Descriptions.Item label='Vlasnik'>{pet.ownerName}</Descriptions.Item>
          <Descriptions.Item label='Vrsta'>{pet.speciesName ?? '-'}</Descriptions.Item>
          <Descriptions.Item label='Rasa'>{pet.breedName ?? '-'}</Descriptions.Item>
          <Descriptions.Item label='Pol'>
            {pet.gender ? genderLabel[pet.gender] : '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Datum rođenja'>
            {pet.dateOfBirth ? dayjs(pet.dateOfBirth).format('DD.MM.YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Težina'>
            {pet.weightKg ? `${pet.weightKg} kg` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Boja'>{pet.color ?? '-'}</Descriptions.Item>
          <Descriptions.Item label='Mikročip'>{pet.microchipNumber ?? '-'}</Descriptions.Item>
          <Descriptions.Item label='Kastriran/a'>
            {pet.isNeutered === null ? '-' : pet.isNeutered ? 'Da' : 'Ne'}
          </Descriptions.Item>
          {pet.allergies && (
            <Descriptions.Item label='Alergije' span={3}>
              {pet.allergies}
            </Descriptions.Item>
          )}
          {pet.note && (
            <Descriptions.Item label='Napomena' span={3}>
              {pet.note}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
