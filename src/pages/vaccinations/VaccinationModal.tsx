import { useEffect } from 'react';
import { Modal, Form, Select, Button, message, Input, DatePicker, Row, Col } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vaccinationsApi } from '@/api/vaccinations';
import { petsApi } from '@/api/pets';
import { usersApi } from '@/api/users';
import type { Vaccination, CreateVaccinationRequest, UpdateVaccinationRequest } from '@/types';
import dayjs from 'dayjs';

interface VaccinationModalProps {
  open: boolean;
  vaccination: Vaccination | null;
  onClose: () => void;
}

export default function VaccinationModal({ open, vaccination, onClose }: VaccinationModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!vaccination;

  const { data: petsData } = useQuery({
    queryKey: ['pets-all'],
    queryFn: () => petsApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (vaccination) {
        form.setFieldsValue({
          ...vaccination,
          administeredAt: dayjs(vaccination.administeredAt),
          validUntil: vaccination.validUntil ? dayjs(vaccination.validUntil) : null,
          nextDueDate: vaccination.nextDueDate ? dayjs(vaccination.nextDueDate) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, vaccination, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateVaccinationRequest) => vaccinationsApi.create(data),
    onSuccess: () => {
      message.success('Vakcinacija je zabeležena!');
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateVaccinationRequest) => vaccinationsApi.update(vaccination!.id, data),
    onSuccess: () => {
      message.success('Vakcinacija je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (
    values: CreateVaccinationRequest & {
      administeredAt?: dayjs.Dayjs;
      validUntil?: dayjs.Dayjs;
      nextDueDate?: dayjs.Dayjs;
    },
  ) => {
    const payload = {
      ...values,
      administeredAt: values.administeredAt ? values.administeredAt.toISOString() : undefined,
      validUntil: values.validUntil ? values.validUntil.format('YYYY-MM-DD') : undefined,
      nextDueDate: values.nextDueDate ? values.nextDueDate.format('YYYY-MM-DD') : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as CreateVaccinationRequest);
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

  return (
    <Modal
      title={isEditing ? 'Izmeni vakcinaciju' : 'Nova vakcinacija'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Row gutter={16}>
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
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
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
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='vaccineName'
              label='Naziv vakcine'
              rules={[{ required: true, message: 'Unesite naziv vakcine!' }]}
            >
              <Input placeholder='Naziv vakcine' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='manufacturer' label='Proizvođač'>
              <Input placeholder='Proizvođač' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='batchNumber' label='Broj serije'>
              <Input placeholder='Broj serije' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='administeredAt'
              label='Datum vakcinacije'
              rules={[{ required: true, message: 'Izaberite datum!' }]}
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
            <Form.Item name='validUntil' label='Važi do'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='nextDueDate' label='Sledeća doza'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Zabeleži vakcinaciju'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
