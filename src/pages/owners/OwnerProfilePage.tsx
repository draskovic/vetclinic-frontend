import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Tabs, Table, Tag, Button, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { ownersApi } from '../../api';
import { petsApi } from '../../api';
import { appointmentsApi } from '../../api';
import { invoicesApi } from '../../api';
import type { Pet } from '../../types';
import dayjs from 'dayjs';
import { medicalRecordsApi } from '../../api';

const { Title } = Typography;

const OwnerProfilePage: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();

  const { data: owner, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner', ownerId],
    queryFn: () => ownersApi.getById(ownerId!).then((res) => res.data),
    enabled: !!ownerId,
  });

  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ['ownerPets', ownerId],
    queryFn: () => petsApi.getByOwner(ownerId!).then((res) => res.data),
    enabled: !!ownerId,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['ownerAppointments', ownerId],
    queryFn: () => appointmentsApi.getByOwner(ownerId!).then((res) => res.data),
    enabled: !!ownerId,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['ownerInvoices', ownerId],
    queryFn: () => invoicesApi.getByOwner(ownerId!).then((res) => res.data),
    enabled: !!ownerId,
  });

  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['ownerMedicalRecords', ownerId],
    queryFn: () => medicalRecordsApi.getByOwner(ownerId!).then((res) => res.data),
    enabled: !!ownerId,
  });

  if (ownerLoading) return <Spin size='large' style={{ display: 'block', margin: '100px auto' }} />;
  if (!owner) return <div>Vlasnik nije pronađen</div>;

  const medicalRecordsColumns = [
    {
      title: 'Datum',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY.'),
    },
    { title: 'Ljubimac', dataIndex: 'petName', key: 'petName' },
    { title: 'Veterinar', dataIndex: 'vetName', key: 'vetName' },
    {
      title: 'Dijagnoza',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (text: string) => text || '-',
    },
    {
      title: 'Simptomi',
      dataIndex: 'symptoms',
      key: 'symptoms',
      render: (text: string) =>
        text ? (text.length > 50 ? text.substring(0, 50) + '...' : text) : '-',
    },
  ];

  const petsColumns = [
    {
      title: 'Ime',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Pet) => (
        <a onClick={() => navigate(`/pets/${record.id}`)}>{text}</a>
      ),
    },
    { title: 'Vrsta', dataIndex: 'speciesName', key: 'speciesName' },
    { title: 'Rasa', dataIndex: 'breedName', key: 'breedName' },
    {
      title: 'Pol',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) =>
        gender === 'MALE' ? 'Mužjak' : gender === 'FEMALE' ? 'Ženka' : gender,
    },
    {
      title: 'Datum rođenja',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      render: (date: string) => (date ? dayjs(date).format('DD.MM.YYYY.') : '-'),
    },
  ];

  const appointmentsColumns = [
    {
      title: 'Datum i vreme',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY. HH:mm'),
    },
    { title: 'Ljubimac', dataIndex: 'petName', key: 'petName' },
    { title: 'Veterinar', dataIndex: 'vetName', key: 'vetName' },
    { title: 'Razlog', dataIndex: 'reason', key: 'reason' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          SCHEDULED: 'blue',
          CONFIRMED: 'cyan',
          IN_PROGRESS: 'orange',
          COMPLETED: 'green',
          CANCELLED: 'red',
          NO_SHOW: 'volcano',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
  ];

  const invoicesColumns = [
    { title: 'Broj', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    {
      title: 'Datum',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      render: (date: string) => (date ? dayjs(date).format('DD.MM.YYYY.') : '-'),
    },
    {
      title: 'Iznos',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number, record: any) =>
        `${amount?.toLocaleString('sr-RS')} ${record.currency || 'RSD'}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          DRAFT: 'default',
          ISSUED: 'blue',
          PAID: 'green',
          PARTIALLY_PAID: 'orange',
          OVERDUE: 'red',
          CANCELLED: 'volcano',
          REFUNDED: 'purple',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/owners')}
        style={{ marginBottom: 16 }}
      >
        Nazad na vlasnike
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <Title level={3}>
          {owner.firstName} {owner.lastName}
        </Title>
        <Descriptions column={2}>
          <Descriptions.Item
            label={
              <>
                <PhoneOutlined /> Telefon
              </>
            }
          >
            {owner.phone || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <>
                <MailOutlined /> Email
              </>
            }
          >
            {owner.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Adresa'>{owner.address || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey='pets'
        items={[
          {
            key: 'pets',
            label: `Ljubimci (${pets.length})`,
            children: (
              <Table
                dataSource={pets}
                columns={petsColumns}
                rowKey='id'
                loading={petsLoading}
                pagination={false}
              />
            ),
          },
          {
            key: 'appointments',
            label: `Termini (${appointments.length})`,
            children: (
              <Table
                dataSource={appointments}
                columns={appointmentsColumns}
                rowKey='id'
                loading={appointmentsLoading}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'medicalRecords',
            label: `Intervencije (${medicalRecords.length})`,
            children: (
              <Table
                dataSource={medicalRecords}
                columns={medicalRecordsColumns}
                rowKey='id'
                loading={recordsLoading}
                pagination={{ pageSize: 10 }}
              />
            ),
          },

          {
            key: 'invoices',
            label: `Fakture (${invoices.length})`,
            children: (
              <Table
                dataSource={invoices}
                columns={invoicesColumns}
                rowKey='id'
                loading={invoicesLoading}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default OwnerProfilePage;
