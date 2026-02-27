import { useEffect, useState } from 'react';
import { Modal, Form, Select, Button, message, DatePicker, Input, Row, Col } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments';
import { ownersApi } from '@/api/owners';
import { petsApi } from '@/api/pets';
import { usersApi } from '@/api/users';
import { clinicLocationsApi } from '@/api/clinic-locations';
import type { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '@/types';
import dayjs from 'dayjs';

interface AppointmentModalProps {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  initialDates?: { start: string; end: string } | null;
}

const typeOptions = [
  { label: 'Pregled', value: 'CHECKUP' },
  { label: 'Vakcinacija', value: 'VACCINATION' },
  { label: 'Operacija', value: 'SURGERY' },
  { label: 'Hitno', value: 'EMERGENCY' },
  { label: 'Kontrola', value: 'FOLLOW_UP' },
  { label: 'Šišanje', value: 'GROOMING' },
];

const statusOptions = [
  { label: 'Zakazan', value: 'SCHEDULED' },
  { label: 'Potvrđen', value: 'CONFIRMED' },
  { label: 'U toku', value: 'IN_PROGRESS' },
  { label: 'Završen', value: 'COMPLETED' },
  { label: 'Otkazan', value: 'CANCELLED' },
  { label: 'Nije došao', value: 'NO_SHOW' },
];

export default function AppointmentModal({
  open,
  appointment,
  onClose,
  initialDates,
}: AppointmentModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!appointment;
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const { data: ownersData } = useQuery({
    queryKey: ['owners-all'],
    queryFn: () => ownersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: petsData } = useQuery({
    queryKey: ['pets-by-owner', selectedOwnerId],
    queryFn: () => petsApi.getByOwner(selectedOwnerId!).then((r) => r.data),
    enabled: !!selectedOwnerId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['clinic-locations-active'],
    queryFn: () => clinicLocationsApi.getActive().then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (appointment) {
        setSelectedOwnerId(appointment.ownerId);
        form.setFieldsValue({
          ...appointment,
          startTime: dayjs(appointment.startTime),
          endTime: dayjs(appointment.endTime),
        });
      } else {
        form.resetFields();
        setSelectedOwnerId(null);
        if (initialDates) {
          form.setFieldsValue({
            startTime: dayjs(initialDates.start),
            endTime: dayjs(initialDates.end),
          });
        }
      }
    }
  }, [open, appointment, form, initialDates]);

  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentRequest) => appointmentsApi.create(data),
    onSuccess: () => {
      message.success('Termin je zakazan!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: () => message.error('Greška pri zakazivanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAppointmentRequest) => appointmentsApi.update(appointment!.id, data),
    onSuccess: () => {
      message.success('Termin je izmenjen!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (
    values: CreateAppointmentRequest & { startTime?: dayjs.Dayjs; endTime?: dayjs.Dayjs },
  ) => {
    const payload = {
      ...values,
      startTime: values.startTime ? values.startTime.toISOString() : undefined,
      endTime: values.endTime ? values.endTime.toISOString() : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as CreateAppointmentRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const ownerOptions =
    ownersData?.content.map((o) => ({
      label: `${o.firstName} ${o.lastName}`,
      value: o.id,
    })) ?? [];

  const petOptions =
    petsData?.map((p) => ({
      label: p.name,
      value: p.id,
    })) ?? [];

  const vetOptions =
    usersData?.content.map((u) => ({
      label: `${u.firstName} ${u.lastName}`,
      value: u.id,
    })) ?? [];

  const locationOptions =
    locationsData?.map((l) => ({
      label: l.name,
      value: l.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni termin' : 'Zakaži termin'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
        initialValues={{ status: 'SCHEDULED' }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='ownerId'
              label='Vlasnik'
              rules={[{ required: true, message: 'Izaberite vlasnika!' }]}
            >
              <Select
                placeholder='Izaberite vlasnika...'
                options={ownerOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(val) => {
                  setSelectedOwnerId(val);
                  form.setFieldValue('petId', undefined);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='petId'
              label='Ljubimac'
              rules={[{ required: true, message: 'Izaberite ljubimca!' }]}
            >
              <Select
                placeholder='Izaberite ljubimca...'
                options={petOptions}
                showSearch
                disabled={!selectedOwnerId}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
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
          <Col span={12}>
            <Form.Item
              name='locationId'
              label='Lokacija'
              rules={[{ required: true, message: 'Izaberite lokaciju!' }]}
            >
              <Select
                placeholder='Izaberite lokaciju...'
                options={locationOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='startTime'
              label='Početak'
              rules={[
                { required: true, message: 'Izaberite početak!' },
                {
                  validator: (_, value) => {
                    if (value && value.isBefore(dayjs())) {
                      return Promise.reject('Izabrali ste datum u prošlosti!');
                    }
                    return Promise.resolve();
                  },
                  warningOnly: true,
                },
              ]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format='DD.MM.YYYY HH:mm'
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='endTime'
              label='Kraj'
              dependencies={['startTime']}
              rules={[
                { required: true, message: 'Izaberite kraj!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startTime = getFieldValue('startTime');
                    if (!value || !startTime) {
                      return Promise.resolve();
                    }
                    if (value.isAfter(startTime)) {
                      return Promise.resolve();
                    }
                    return Promise.reject('Kraj mora biti posle početka!');
                  },
                }),
              ]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format='DD.MM.YYYY HH:mm'
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='type'
              label='Tip termina'
              rules={[{ required: true, message: 'Izaberite tip!' }]}
            >
              <Select placeholder='Izaberite tip...' options={typeOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='status' label='Status'>
              <Select placeholder='Status...' options={statusOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='reason' label='Razlog'>
          <Input.TextArea placeholder='Razlog posete...' rows={2} />
        </Form.Item>

        <Form.Item name='notes' label='Napomene'>
          <Input.TextArea placeholder='Dodatne napomene...' rows={2} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Zakaži termin'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
