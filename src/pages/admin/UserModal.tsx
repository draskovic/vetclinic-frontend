import { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Switch, Row, Col } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { rolesApi } from '@/api/roles';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types';

interface UserModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export default function UserModal({ open, user, onClose }: UserModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => rolesApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          ...user,
          roleId: user.roleId,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, user, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      message.success('Korisnik je kreiran!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.update(user!.id, data),
    onSuccess: () => {
      message.success('Korisnik je izmenjen!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateUserRequest) => {
    const payload = {
      ...values,
      active: values.active ?? true,
    };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const roleOptions =
    rolesData?.content.map((r) => ({
      label: r.name,
      value: r.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni korisnika' : 'Novi korisnik'}
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
        initialValues={{ active: true }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='firstName'
              label='Ime'
              rules={[{ required: true, message: 'Unesite ime!' }]}
            >
              <Input placeholder='Ime' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='lastName'
              label='Prezime'
              rules={[{ required: true, message: 'Unesite prezime!' }]}
            >
              <Input placeholder='Prezime' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='email'
              label='Email'
              rules={[
                { required: true, message: 'Unesite email!' },
                { type: 'email', message: 'Unesite ispravnu email adresu!' },
              ]}
            >
              <Input placeholder='email@example.com' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='roleId'
              label='Rola'
              rules={[{ required: true, message: 'Izaberite rolu!' }]}
            >
              <Select
                placeholder='Izaberite rolu...'
                options={roleOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        {!isEditing && (
          <Form.Item
            name='password'
            label='Lozinka'
            rules={[
              { required: true, message: 'Unesite lozinku!' },
              { min: 6, message: 'Lozinka mora imati minimum 6 karaktera!' },
            ]}
          >
            <Input.Password placeholder='Lozinka' />
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='phone' label='Telefon'>
              <Input placeholder='+381...' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='licenseNumber' label='Broj licence'>
              <Input placeholder='Broj licence veterinara' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='specialization' label='Specijalizacija'>
              <Input placeholder='Npr. hirurgija, dermatologija...' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='active' label='Aktivan' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj korisnika'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
