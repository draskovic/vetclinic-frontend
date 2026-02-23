import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  DatePicker,
  Row,
  Col,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { vaccinationsApi } from '@/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Vaccination } from '@/types';
import dayjs from 'dayjs';

interface VaccinationItemsTableProps {
  medicalRecordId: string | null;
  petId: string;
  vetId: string;
}

export default function VaccinationItemsTable({
  medicalRecordId,
  petId,
  vetId,
}: VaccinationItemsTableProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [adding, setAdding] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [administeredAt, setAdministeredAt] = useState<dayjs.Dayjs>(dayjs());
  const [validUntil, setValidUntil] = useState<dayjs.Dayjs | null>(null);
  const [nextDueDate, setNextDueDate] = useState<dayjs.Dayjs | null>(null);

  const { data: vaccinationsData, refetch } = useQuery({
    queryKey: ['vaccinations-by-mr', medicalRecordId],
    queryFn: () => vaccinationsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  useEffect(() => {
    if (vaccinationsData) {
      setVaccinations(vaccinationsData.data);
    }
  }, [vaccinationsData]);

  const resetForm = () => {
    setVaccineName('');
    setBatchNumber('');
    setManufacturer('');
    setAdministeredAt(dayjs());
    setValidUntil(null);
    setNextDueDate(null);
    setAdding(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      vaccinationsApi.create({
        medicalRecordId: medicalRecordId!,
        petId,
        vetId,
        vaccineName,
        batchNumber: batchNumber || undefined,
        manufacturer: manufacturer || undefined,
        administeredAt: administeredAt.toISOString(),
        validUntil: validUntil ? validUntil.format('YYYY-MM-DD') : undefined,
        nextDueDate: nextDueDate ? nextDueDate.format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => {
      message.success('Vakcinacija dodata!');
      resetForm();
      refetch();
    },
    onError: () => message.error('Greška pri dodavanju vakcinacije!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaccinationsApi.delete(id),
    onSuccess: () => {
      message.success('Vakcinacija uklonjena!');
      refetch();
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre dodavanja vakcinacija.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={vaccinations}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          {
            title: 'Vakcina',
            dataIndex: 'vaccineName',
            key: 'vaccineName',
          },
          {
            title: 'Datum',
            dataIndex: 'administeredAt',
            key: 'administeredAt',
            width: 100,
            render: (val: string) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
          },
          {
            title: 'Važi do',
            dataIndex: 'validUntil',
            key: 'validUntil',
            width: 100,
            render: (val: string) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
          },
          {
            title: 'Sledeća doza',
            dataIndex: 'nextDueDate',
            key: 'nextDueDate',
            width: 100,
            render: (val: string) => (val ? dayjs(val).format('DD.MM.YYYY') : '-'),
          },
          {
            title: '',
            key: 'actions',
            width: 50,
            render: (_, rec) => (
              <Popconfirm
                title='Ukloniti vakcinaciju?'
                onConfirm={() => deleteMutation.mutate(rec.id)}
              >
                <Button type='text' danger icon={<DeleteOutlined />} size='small' />
              </Popconfirm>
            ),
          },
        ]}
        title={() =>
          adding ? (
            <div>
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={8}>
                  <Input
                    placeholder='Naziv vakcine *'
                    value={vaccineName}
                    onChange={(e) => setVaccineName(e.target.value)}
                  />
                </Col>
                <Col span={8}>
                  <Input
                    placeholder='Proizvođač'
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </Col>
                <Col span={8}>
                  <Input
                    placeholder='Broj serije'
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}>
                  <DatePicker
                    placeholder='Datum davanja *'
                    value={administeredAt}
                    onChange={(val) => val && setAdministeredAt(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={8}>
                  <DatePicker
                    placeholder='Važi do'
                    value={validUntil}
                    onChange={(val) => setValidUntil(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={8}>
                  <DatePicker
                    placeholder='Sledeća doza'
                    value={nextDueDate}
                    onChange={(val) => setNextDueDate(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
              <Space style={{ marginTop: 8 }}>
                <Button
                  type='primary'
                  icon={<SaveOutlined />}
                  disabled={!vaccineName.trim()}
                  loading={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Sačuvaj
                </Button>
                <Button icon={<CloseOutlined />} onClick={resetForm}>
                  Otkaži
                </Button>
              </Space>
            </div>
          ) : (
            <Button type='dashed' icon={<PlusOutlined />} onClick={() => setAdding(true)}>
              Dodaj vakcinaciju
            </Button>
          )
        }
      />
    </div>
  );
}
