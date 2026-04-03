import { useState, useEffect } from 'react';
import QrUploadModal from '@/components/QrUploadModal';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ImgCrop from 'antd-img-crop';

import {
  Card,
  Tabs,
  Table,
  Tag,
  Descriptions,
  Spin,
  Button,
  Space,
  Typography,
  message,
  Avatar,
  Upload,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  QrcodeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  CameraOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { petsApi } from '@/api/pets';
import { appointmentsApi } from '@/api/appointments';
import { medicalRecordsApi } from '@/api/medical-records';
import { vaccinationsApi } from '@/api/vaccinations';
import { labReportsApi } from '@/api/lab-reports';
import { documentsApi } from '@/api/documents';
import type { Appointment, MedicalRecord, Vaccination, LabReport, DocumentRecord } from '@/types';
import MedicalRecordModal from '../medical-records/MedicalRecordModal';
import { useAuthStore } from '@/store/authStore';

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
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  const { data: pet, isLoading: petLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsApi.getById(petId!).then((r) => r.data),
    enabled: !!petId,
  });

  const user = useAuthStore((s) => s.user);

  const queryClient = useQueryClient();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!pet?.photoUrl) {
      setAvatarSrc(null);
      return;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const accessToken = localStorage.getItem('accessToken');
    const clinicId = localStorage.getItem('clinicId');
    fetch(`${baseUrl}/documents/${pet.photoUrl}/download`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Clinic-Id': clinicId || '' },
    })
      .then((res) => res.blob())
      .then((blob) => setAvatarSrc(URL.createObjectURL(blob)))
      .catch(() => setAvatarSrc(null));
  }, [pet?.photoUrl]);

  const handleAvatarUpload = async (file: File) => {
    try {
      const res = await documentsApi.uploadWithFile(petId!, file, 'Profilna fotografija');
      const documentId = res.data.id;
      await petsApi.setProfilePhoto(petId!, documentId);
      queryClient.invalidateQueries({ queryKey: ['pet', petId] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'by-pet', petId] });
      message.success('Profilna slika postavljena');
    } catch {
      message.error('Greška pri postavljanju slike');
    }
    return false;
  };

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

  const { data: documents = [], isLoading: docLoading } = useQuery({
    queryKey: ['documents', 'by-pet', petId],
    queryFn: () => documentsApi.getByPet(petId!).then((r) => r.data),
    enabled: !!petId,
    refetchInterval: qrModalOpen ? 5000 : false,
  });

  const handleDownloadVaccinationPdf = async () => {
    try {
      const response = await vaccinationsApi.downloadPdfByPet(petId!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vakcinacije-${pet?.name || petId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Greška pri preuzimanju PDF-a');
    }
  };

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
    {
      title: 'Akcije',
      key: 'actions',
      render: (_: unknown, record: MedicalRecord) => (
        <Button
          type='link'
          size='small'
          onClick={() => {
            setSelectedRecord(record);
            setRecordModalOpen(true);
          }}
        >
          Otvori
        </Button>
      ),
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
  const documentColumns: ColumnsType<DocumentRecord> = [
    { title: 'Naziv fajla', dataIndex: 'fileName', key: 'fileName' },
    {
      title: 'Tip',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Akcije',
      key: 'actions',
      render: (_: unknown, record: DocumentRecord) => (
        <Space>
          <Button
            type='link'
            size='small'
            onClick={() => {
              const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
              const token = localStorage.getItem('accessToken');
              const clinicId = localStorage.getItem('clinicId');
              const url = `${baseUrl}/documents/${record.id}/download`;
              fetch(url, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Clinic-Id': clinicId || '',
                },
              })
                .then((res) => res.blob())
                .then((blob) => {
                  const objectUrl = window.URL.createObjectURL(blob);
                  window.open(objectUrl, '_blank');
                })
                .catch(() => message.error('Greška pri otvaranju fajla'));
            }}
          >
            Otvori
          </Button>
          {record.fileType === 'IMAGE' && (
            <Tooltip title='Postavi kao profilnu sliku'>
              <Button
                type='link'
                size='small'
                icon={<PictureOutlined />}
                onClick={async () => {
                  try {
                    await petsApi.setProfilePhoto(petId!, record.id);
                    queryClient.invalidateQueries({ queryKey: ['pet', petId] });
                    message.success('Profilna slika postavljena');
                  } catch {
                    message.error('Greška pri postavljanju slike');
                  }
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
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
        <>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedRecord(null);
                setRecordModalOpen(true);
              }}
            >
              Nova intervencija
            </Button>
          </div>
          <Table
            dataSource={medicalRecords}
            columns={medicalRecordColumns}
            rowKey='id'
            loading={mrLoading}
            pagination={{ pageSize: 10 }}
            size='small'
          />
        </>
      ),
    },

    {
      key: 'vaccinations',
      label: `Vakcinacije (${vaccinations.length})`,
      children: (
        <>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleDownloadVaccinationPdf}
              disabled={vaccinations.length === 0}
            >
              Štampaj vakcinacioni list
            </Button>
          </div>
          <Table
            dataSource={vaccinations}
            columns={vaccinationColumns}
            rowKey='id'
            loading={vacLoading}
            pagination={{ pageSize: 10 }}
            size='small'
          />
        </>
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

    {
      key: 'documents',
      label: `Dokumenti (${documents.length})`,
      children: (
        <Table
          dataSource={documents}
          columns={documentColumns}
          rowKey='id'
          loading={docLoading}
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
        <Button icon={<QrcodeOutlined />} onClick={() => setQrModalOpen(true)} disabled={!pet}>
          Upload dokumenata sa telefona
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <ImgCrop rotationSlider quality={0.8} modalTitle='Izaberi isečak'>
            <Upload showUploadList={false} accept='image/*' beforeUpload={handleAvatarUpload}>
              <Tooltip title='Promeni fotografiju'>
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                  <Avatar src={avatarSrc} size={96} style={{ border: '2px solid #f0f0f0' }}>
                    {pet.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: '#1677ff',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                    }}
                  >
                    <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
                  </div>
                </div>
              </Tooltip>
            </Upload>
          </ImgCrop>
          <div style={{ flex: 1 }}>
            <Descriptions
              title={
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    {pet.name}
                  </Title>
                  {pet.isDeceased && <Tag color='red'>Preminuo/la</Tag>}
                  {pet.patientCode && <Tag color='blue'>Br. kartona: {pet.patientCode}</Tag>}
                  {pet.legacyCode && <Tag color='default'>Stari br.: {pet.legacyCode}</Tag>}
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
          </div>
        </div>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {pet && (
        <QrUploadModal
          open={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          petId={pet.id}
          petName={pet.name}
        />
      )}
      <MedicalRecordModal
        open={recordModalOpen}
        record={selectedRecord}
        onClose={() => {
          setRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        defaultValues={{ petId: petId, vetId: user?.id }}
      />
    </div>
  );
}
