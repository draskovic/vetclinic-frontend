import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Input,
  InputNumber,
  Switch,
  DatePicker,
  Row,
  Tabs,
  Col,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { medicalRecordsApi } from '@/api/medical-records';
import { petsApi } from '@/api/pets';
import { usersApi } from '@/api/users';
import { appointmentsApi } from '@/api/appointments';
import type {
  MedicalRecord,
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest,
} from '@/types';
import dayjs from 'dayjs';
import TreatmentItemsTable from './TreatmentItemsTable';
import LabReportItemsTable from './LabReportItemsTable';
import VaccinationItemsTable from './VaccinationItemsTable';
import PrescriptionItemsTable from './PrescriptionItemsTable';

interface MedicalRecordModalProps {
  open: boolean;
  record: MedicalRecord | null;
  onClose: () => void;
}

export default function MedicalRecordModal({ open, record, onClose }: MedicalRecordModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [createdRecord, setCreatedRecord] = useState<MedicalRecord | null>(null);
  const currentRecord = record ?? createdRecord;

  const isEditMode = !!currentRecord;

  const { data: petsData } = useQuery({
    queryKey: ['pets-all'],
    queryFn: () => petsApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments-all'],
    queryFn: () => appointmentsApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (record) {
        form.setFieldsValue({
          ...record,
          followUpDate: record.followUpDate ? dayjs(record.followUpDate) : null,
        });
      } else {
        form.resetFields();
        setCreatedRecord(null);
      }
    }
  }, [open, record, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordRequest) => medicalRecordsApi.create(data),
    onSuccess: (response) => {
      message.success(
        'Intervencija je kreirana! Sada možete dodati usluge, vakcinacije i lab izveštaje.',
      );
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      setCreatedRecord(response.data);
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMedicalRecordRequest) =>
      medicalRecordsApi.update(currentRecord!.id, data),
    onSuccess: () => {
      message.success('Intervencija je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateMedicalRecordRequest & { followUpDate?: dayjs.Dayjs }) => {
    const payload = {
      ...values,
      appointmentId: values.appointmentId ?? null,
      followUpRecommended: values.followUpRecommended ?? false,
      followUpDate: values.followUpDate ? values.followUpDate.format('YYYY-MM-DD') : null,
    };
    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const petOptions =
    petsData?.content.map((p) => ({
      label: p.name,
      value: p.id,
    })) ?? [];

  const vetOptions =
    usersData?.content.map((u) => ({
      label: `${u.firstName} ${u.lastName}`,
      value: u.id,
    })) ?? [];

  const appointmentOptions =
    appointmentsData?.content.map((a) => ({
      label: `${dayjs(a.startTime).format('DD.MM.YYYY HH:mm')} - ${a.petName} (${a.ownerName})`,
      value: a.id,
    })) ?? [];

  return (
    <Modal
      title={isEditMode ? 'Izmeni intervenciju' : 'Nova intervencija'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1000}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        {/* Red 1: Termin, Veterinar, Ljubimac, Simptomi */}
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name='appointmentId' label='Termin (opciono)'>
              <Select
                placeholder='Izaberite termin...'
                options={appointmentOptions}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='vetId'
              label='Veterinar'
              rules={[{ required: true, message: 'Izaberite veterinara!' }]}
            >
              <Select
                placeholder='Izaberite veterinara...'
                options={vetOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='petId'
              label='Ljubimac'
              rules={[{ required: true, message: 'Izaberite ljubimca!' }]}
            >
              <Select
                placeholder='Izaberite ljubimca...'
                options={petOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='symptoms' label='Simptomi'>
              <Input placeholder='Simptomi...' />
            </Form.Item>
          </Col>
        </Row>

        {/* Red 2: Dijagnoza, Beleške sa pregleda */}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name='diagnosis' label='Dijagnoza'>
              <Input.TextArea placeholder='Dijagnoza...' rows={2} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='examinationNotes' label='Beleške sa pregleda'>
              <Input.TextArea placeholder='Beleške...' rows={2} />
            </Form.Item>
          </Col>
        </Row>

        {/* Red 3: Težina, Temperatura, Puls, Preporučena kontrola, Datum kontrole */}
        <Row gutter={12}>
          <Col span={4}>
            <Form.Item name='weightKg' label='Težina (kg)'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder='0.0' />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='temperatureC' label='Temperatura (°C)'>
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={45}
                step={0.1}
                placeholder='38.5'
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='heartRate' label='Puls (bpm)'>
              <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder='80' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='followUpRecommended'
              label='Preporučena kontrola'
              valuePropName='checked'
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='followUpDate' label='Datum kontrole'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        {isEditMode && (
          <Tabs
            style={{ marginTop: 8 }}
            items={[
              {
                key: 'treatments',
                label: 'Usluge',
                children: (
                  <TreatmentItemsTable
                    medicalRecordId={currentRecord?.id ?? null}
                    vetId={currentRecord?.vetId ?? ''}
                  />
                ),
              },
              {
                key: 'vaccinations',
                label: 'Vakcinacije',
                children: (
                  <VaccinationItemsTable
                    medicalRecordId={currentRecord?.id ?? null}
                    petId={currentRecord?.petId ?? ''}
                    vetId={currentRecord?.vetId ?? ''}
                  />
                ),
              },
              {
                key: 'lab-reports',
                label: 'Lab izveštaji',
                children: (
                  <LabReportItemsTable
                    medicalRecordId={currentRecord?.id ?? null}
                    petId={currentRecord?.petId ?? ''}
                  />
                ),
              },
              {
                key: 'prescriptions',
                label: 'Recepti',
                children: (
                  <PrescriptionItemsTable
                    medicalRecordId={currentRecord?.id ?? null}
                    petId={currentRecord?.petId ?? ''}
                    vetId={currentRecord?.vetId ?? ''}
                  />
                ),
              },
            ]}
          />
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditMode ? 'Sačuvaj izmene' : 'Kreiraj intervenciju'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
