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
  InputNumber,
  Tooltip,
  AutoComplete,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { prescriptionsApi } from '@/api/prescriptions';
import { inventoryItemsApi } from '@/api/inventory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Prescription, InventoryItem } from '@/types';
import dayjs from 'dayjs';

interface PrescriptionItemsTableProps {
  medicalRecordId: string | null;
  petId: string;
  vetId: string;
}

export default function PrescriptionItemsTable({
  medicalRecordId,
  petId,
  vetId,
}: PrescriptionItemsTableProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [adding, setAdding] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [instructions, setInstructions] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const debouncedMedicationSearch = useDebouncedValue(medicationSearch, 300);

  const { data: prescriptionsData, refetch } = useQuery({
    queryKey: ['prescriptions-by-mr', medicalRecordId],
    queryFn: () => prescriptionsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  const { data: medicationsData } = useQuery({
    queryKey: ['inventory-medications-search', debouncedMedicationSearch],
    queryFn: () =>
      inventoryItemsApi.getAll(0, 20, debouncedMedicationSearch || undefined, 'MEDICATION'),
    enabled: adding,
  });

  const medications: InventoryItem[] = medicationsData?.data?.content ?? [];

  useEffect(() => {
    if (prescriptionsData) {
      setPrescriptions(prescriptionsData.data);
    }
  }, [prescriptionsData]);

  const resetForm = () => {
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setDurationDays(null);
    setStartDate(dayjs());
    setEndDate(null);
    setInstructions('');
    setMedicationSearch('');
    setInventoryItemId(null);
    setAdding(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      prescriptionsApi.create({
        medicalRecordId: medicalRecordId!,
        petId,
        vetId,
        medicationName,
        dosage,
        frequency,
        durationDays: durationDays ?? undefined,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
        instructions: instructions || undefined,
        inventoryItemId: inventoryItemId ?? undefined,
      }),
    onSuccess: () => {
      message.success('Recept dodat!');
      resetForm();
      refetch();
    },
    onError: () => message.error('Greška pri dodavanju recepta!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.delete(id),
    onSuccess: () => {
      message.success('Recept uklonjen!');
      refetch();
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const handleDownloadPdf = async (id: string, medicationName: string) => {
    try {
      const response = await prescriptionsApi.downloadPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recept-${medicationName}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Greška pri preuzimanju PDF-a');
    }
  };

  const handleMedicationNameChange = (value: string) => {
    setMedicationName(value);
    setMedicationSearch(value);
    const matched = medications.find((m) => m.name === value);
    setInventoryItemId(matched?.id ?? null);
  };
  const isFormValid = medicationName.trim() && dosage.trim() && frequency.trim() && startDate;

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre dodavanja recepata.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={prescriptions}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          { title: 'Lek', dataIndex: 'medicationName', key: 'medicationName' },
          { title: 'Doza', dataIndex: 'dosage', key: 'dosage' },
          { title: 'Učestalost', dataIndex: 'frequency', key: 'frequency' },
          {
            title: 'Trajanje',
            dataIndex: 'durationDays',
            key: 'durationDays',
            width: 90,
            render: (v: number | null) => (v ? `${v} dana` : '-'),
          },
          {
            title: 'Od',
            dataIndex: 'startDate',
            key: 'startDate',
            width: 100,
            render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
          },
          {
            title: 'Do',
            dataIndex: 'endDate',
            key: 'endDate',
            width: 100,
            render: (v: string | null) => (v ? dayjs(v).format('DD.MM.YYYY') : '-'),
          },
          {
            title: '',
            key: 'actions',
            width: 80,
            render: (_, rec) => (
              <Space>
                <Tooltip title='Preuzmi PDF'>
                  <Button
                    type='text'
                    icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
                    size='small'
                    onClick={() => handleDownloadPdf(rec.id, rec.medicationName)}
                  />
                </Tooltip>
                <Popconfirm
                  title='Ukloniti recept?'
                  onConfirm={() => deleteMutation.mutate(rec.id)}
                >
                  <Button type='text' danger icon={<DeleteOutlined />} size='small' />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        title={() =>
          adding ? (
            <div>
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={8}>
                  <AutoComplete
                    placeholder='Naziv leka *'
                    value={medicationName}
                    onChange={handleMedicationNameChange}
                    style={{ width: '100%' }}
                    filterOption={false}
                    onInputKeyDown={(e) => {
                      if (e.key === ' ') e.stopPropagation();
                    }}
                    options={medications.map((item) => ({
                      value: item.name,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.name}</span>
                          <span style={{ color: '#52c41a', fontSize: 12 }}>
                            {item.quantityOnHand > 0
                              ? `${item.quantityOnHand} ${item.unit ?? ''}`
                              : 'Van lagera'}
                          </span>
                        </div>
                      ),
                    }))}
                  />
                </Col>
                <Col span={8}>
                  <Input
                    placeholder='Doza *'
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </Col>
                <Col span={8}>
                  <Input
                    placeholder='Učestalost * (npr. 2x dnevno)'
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  />
                </Col>
              </Row>
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={6}>
                  <InputNumber
                    placeholder='Trajanje (dana)'
                    value={durationDays}
                    onChange={(v) => setDurationDays(v)}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={6}>
                  <DatePicker
                    placeholder='Datum početka *'
                    value={startDate}
                    onChange={(val) => val && setStartDate(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={6}>
                  <DatePicker
                    placeholder='Datum završetka'
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder='Uputstvo'
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </Col>
              </Row>
              <Space style={{ marginTop: 8 }}>
                <Button
                  type='primary'
                  icon={<SaveOutlined />}
                  disabled={!isFormValid}
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
              Dodaj recept
            </Button>
          )
        }
      />
    </div>
  );
}
