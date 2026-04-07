import { useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, Row, Col, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { diagnosesApi } from '@/api';
import type { Diagnosis, CreateDiagnosisRequest, UpdateDiagnosisRequest } from '@/types';

interface DiagnosisModalProps {
  open: boolean;
  diagnosis: Diagnosis | null;
  onClose: () => void;
}

export default function DiagnosisModal({ open, diagnosis, onClose }: DiagnosisModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!diagnosis;

  useEffect(() => {
    if (open) {
      if (diagnosis) {
        form.setFieldsValue(diagnosis);
      } else {
        form.resetFields();
        form.setFieldsValue({ active: true });
      }
    }
  }, [open, diagnosis, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateDiagnosisRequest) => diagnosesApi.create(data),
    onSuccess: () => {
      message.success('Dijagnoza je dodata');
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDiagnosisRequest) => diagnosesApi.update(diagnosis!.id, data),
    onSuccess: () => {
      message.success('Dijagnoza je izmenjena');
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni'),
  });

  const handleSubmit = (values: CreateDiagnosisRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Izmeni dijagnozu' : 'Nova dijagnoza'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name='code' label='Šifra'>
              <Input placeholder='npr. D001' />
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item
              name='name'
              label='Naziv dijagnoze'
              rules={[{ required: true, message: 'Unesite naziv dijagnoze' }]}
            >
              <Input placeholder='npr. Dermatitis alergijska' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='category' label='Kategorija'>
          <Input placeholder='npr. Dermatologija, Kardiologija, Ortopedija...' />
        </Form.Item>

        <Form.Item name='description' label='Opis'>
          <Input.TextArea rows={3} placeholder='Detaljniji opis dijagnoze (opciono)' />
        </Form.Item>

        <Form.Item name='active' label='Aktivna' valuePropName='checked'>
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj dijagnozu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
