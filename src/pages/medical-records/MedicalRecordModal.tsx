import { useEffect } from 'react';
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
  Divider,
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

interface MedicalRecordModalProps {
  open: boolean;
  record: MedicalRecord | null;
  onClose: () => void;
}

export default function MedicalRecordModal({ open, record, onClose }: MedicalRecordModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!record;

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
      }
    }
  }, [open, record, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordRequest) => medicalRecordsApi.create(data),
    onSuccess: () => {
      message.success('Intervencija je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      onClose();
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMedicalRecordRequest) => medicalRecordsApi.update(record!.id, data),
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
    if (isEditing) {
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
      title={isEditing ? 'Izmeni intervenciju' : 'Nova intervencija'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1300}
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

        <Row gutter={16}>
          <Col span={12}>
            <Divider style={{ marginBottom: 8 }}>Usluge</Divider>
            <TreatmentItemsTable medicalRecordId={record?.id ?? null} vetId={record?.vetId ?? ''} />
          </Col>
          <Col span={12}>
            <Divider style={{ marginBottom: 8 }}>Lab izveštaji</Divider>
            <LabReportItemsTable medicalRecordId={record?.id ?? null} petId={record?.petId ?? ''} />
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj intervenciju'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
