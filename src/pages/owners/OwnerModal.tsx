import { useEffect } from 'react';
import { Modal, Form, Input, Button, Row, Col } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ownersApi } from '@/api/owners';
import type { Owner, CreateOwnerRequest, UpdateOwnerRequest } from '@/types';
import { message } from 'antd';

interface OwnerModalProps {
  open: boolean;
  owner: Owner | null;
  onClose: () => void;
}

export default function OwnerModal({ open, owner, onClose }: OwnerModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!owner;

  useEffect(() => {
    if (open) {
      if (owner) {
        form.setFieldsValue(owner);
      } else {
        form.resetFields();
      }
    }
  }, [open, owner, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateOwnerRequest) => ownersApi.create(data),
    onSuccess: () => {
      message.success('Vlasnik je dodat!');
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOwnerRequest) => ownersApi.update(owner!.id, data),
    onSuccess: () => {
      message.success('Vlasnik je izmenjen!');
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateOwnerRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Izmeni vlasnika' : 'Dodaj vlasnika'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        {/* Red 1: Ime, Prezime, Telefon */}
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name='firstName'
              label='Ime'
              rules={[{ required: true, message: 'Unesite ime!' }]}
            >
              <Input placeholder='Ime' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name='lastName'
              label='Prezime'
              rules={[{ required: true, message: 'Unesite prezime!' }]}
            >
              <Input placeholder='Prezime' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name='phone'
              label='Telefon'
              rules={[{ required: true, message: 'Unesite telefon!' }]}
            >
              <Input placeholder='+381...' />
            </Form.Item>
          </Col>
        </Row>

        {/* Red 2: Email, Grad, Adresa */}
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name='email'
              label='Email'
              rules={[{ type: 'email', message: 'Unesite ispravnu email adresu!' }]}
            >
              <Input placeholder='email@example.com' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='city' label='Grad'>
              <Input placeholder='Grad' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='address' label='Adresa'>
              <Input placeholder='Adresa' />
            </Form.Item>
          </Col>
        </Row>

        {/* Red 3: JMBG, Napomena */}
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name='personalId' label='JMBG'>
              <Input placeholder='JMBG' />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name='note' label='Napomena'>
              <Input.TextArea placeholder='Napomena...' rows={3} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj vlasnika'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
