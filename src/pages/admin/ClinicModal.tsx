import { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Switch, DatePicker, Row, Col } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicsApi } from '@/api/clinics';
import type { Clinic, CreateClinicRequest, UpdateClinicRequest } from '@/types';
import dayjs from 'dayjs';

interface ClinicModalProps {
  open: boolean;
  clinic: Clinic | null;
  onClose: () => void;
}

const planOptions = [
  { label: 'Basic', value: 'BASIC' },
  { label: 'Standard', value: 'STANDARD' },
  { label: 'Premium', value: 'PREMIUM' },
];

export default function ClinicModal({ open, clinic, onClose }: ClinicModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!clinic;

  useEffect(() => {
    if (open) {
      if (clinic) {
        form.setFieldsValue({
          ...clinic,
          subscriptionExpiresAt: clinic.subscriptionExpiresAt
            ? dayjs(clinic.subscriptionExpiresAt)
            : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, clinic, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateClinicRequest) => clinicsApi.create(data),
    onSuccess: () => {
      message.success('Klinika je dodata!');
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateClinicRequest) => clinicsApi.update(clinic!.id, data),
    onSuccess: () => {
      message.success('Klinika je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateClinicRequest & { subscriptionExpiresAt?: dayjs.Dayjs }) => {
    const payload = {
      ...values,
      active: values.active ?? true,
      settings: values.settings ?? '{}',
      subscriptionExpiresAt: values.subscriptionExpiresAt
        ? values.subscriptionExpiresAt.toISOString()
        : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Izmeni kliniku' : 'Dodaj kliniku'}
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
        initialValues={{ active: true, subscriptionPlan: 'BASIC', settings: '{}' }}
      >
        <Form.Item
          name='name'
          label='Naziv klinike'
          rules={[{ required: true, message: 'Unesite naziv!' }]}
        >
          <Input placeholder='Naziv klinike' />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='email' label='Email'>
              <Input placeholder='email@klinika.com' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='phone' label='Telefon'>
              <Input placeholder='+381...' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='city' label='Grad'>
              <Input placeholder='Grad' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='country' label='Država'>
              <Input placeholder='Država' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='address' label='Adresa'>
          <Input placeholder='Adresa' />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='taxId' label='PIB'>
              <Input placeholder='Poreski identifikacioni broj' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='subscriptionPlan' label='Plan pretplate'>
              <Select options={planOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='subscriptionExpiresAt' label='Pretplata ističe'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='active' label='Aktivna' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj kliniku'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
