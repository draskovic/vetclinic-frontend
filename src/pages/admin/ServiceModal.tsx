import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, Row, Col, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api';
import type { Service, CreateServiceRequest, UpdateServiceRequest, ServiceCategory } from '@/types';

const categoryOptions: { value: ServiceCategory; label: string }[] = [
  { value: 'EXAMINATION', label: 'Pregled' },
  { value: 'SURGERY', label: 'Hirurgija' },
  { value: 'VACCINATION', label: 'Vakcinacija' },
  { value: 'LAB', label: 'Laboratorija' },
  { value: 'DENTAL', label: 'Stomatologija' },
  { value: 'GROOMING', label: 'Grooming' },
  { value: 'OTHER', label: 'Ostalo' },
];

interface ServiceModalProps {
  open: boolean;
  service: Service | null;
  onClose: () => void;
}

export default function ServiceModal({ open, service, onClose }: ServiceModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!service;

  useEffect(() => {
    if (open) {
      if (service) {
        form.setFieldsValue(service);
      } else {
        form.resetFields();
        form.setFieldsValue({ taxRate: 20, active: true });
      }
    }
  }, [open, service, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateServiceRequest) => servicesApi.create(data),
    onSuccess: () => {
      message.success('Usluga je dodata');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateServiceRequest) => servicesApi.update(service!.id, data),
    onSuccess: () => {
      message.success('Usluga je izmenjena');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni'),
  });

  const handleSubmit = (values: CreateServiceRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Izmeni uslugu' : 'Nova usluga'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name='name'
              label='Naziv usluge'
              rules={[{ required: true, message: 'Unesite naziv usluge' }]}
            >
              <Input placeholder='npr. Opšti pregled, Vakcinacija, Kastracija...' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name='category'
              label='Kategorija'
              rules={[{ required: true, message: 'Izaberite kategoriju' }]}
            >
              <Select options={categoryOptions} placeholder='Izaberite' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='description' label='Opis'>
          <Input.TextArea rows={3} placeholder='Kratak opis usluge (opciono)' />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name='price'
              label='Cena (RSD)'
              rules={[{ required: true, message: 'Unesite cenu' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name='taxRate'
              label='PDV stopa (%)'
              rules={[{ required: true, message: 'Unesite PDV' }]}
            >
              <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='durationMinutes' label='Trajanje (min)'>
              <InputNumber min={1} style={{ width: '100%' }} placeholder='npr. 30' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='active' label='Aktivna' valuePropName='checked'>
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj uslugu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
