import { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/roles';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '@/types';

interface RoleModalProps {
  open: boolean;
  role: Role | null;
  onClose: () => void;
}

const availablePermissions = [
  { label: 'Sve permisije (*)', value: '*' },
  { label: 'Upravljanje terminima', value: 'manage_appointments' },
  { label: 'Upravljanje intervencijama', value: 'manage_medical_records' },
  { label: 'Upravljanje vakcinacijama', value: 'manage_vaccinations' },
  { label: 'Upravljanje vlasnicima', value: 'manage_owners' },
  { label: 'Upravljanje ljubimcima', value: 'manage_pets' },
  { label: 'Upravljanje fakturama', value: 'manage_invoices' },
  { label: 'Upravljanje inventarom', value: 'manage_inventory' },
  { label: 'Pregled izveštaja', value: 'view_reports' },
];

export default function RoleModal({ open, role, onClose }: RoleModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!role;

  useEffect(() => {
    if (open) {
      if (role) {
        let perms: string[] = [];
        try {
          perms = JSON.parse(role.permissions);
        } catch {
          perms = [];
        }
        form.setFieldsValue({
          name: role.name,
          permissions: perms,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, role, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesApi.create(data),
    onSuccess: () => {
      message.success('Rola je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRoleRequest) => rolesApi.update(role!.id, data),
    onSuccess: () => {
      message.success('Rola je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: { name: string; permissions: string[] }) => {
    const payload = {
      name: values.name,
      permissions: JSON.stringify(values.permissions ?? []),
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
      title={isEditing ? 'Izmeni rolu' : 'Nova rola'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={500}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Form.Item
          name='name'
          label='Naziv role'
          rules={[{ required: true, message: 'Unesite naziv!' }]}
        >
          <Input placeholder='Npr. VET, RECEPTIONIST...' />
        </Form.Item>

        <Form.Item name='permissions' label='Permisije'>
          <Select
            mode='multiple'
            placeholder='Izaberite permisije...'
            options={availablePermissions}
            allowClear
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj rolu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
