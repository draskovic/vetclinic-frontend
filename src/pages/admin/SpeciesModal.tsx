import { useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { speciesApi } from '@/api/species';
import type { Species, CreateSpeciesRequest, UpdateSpeciesRequest } from '@/types';

interface SpeciesModalProps {
  open: boolean;
  species: Species | null;
  onClose: () => void;
}

export default function SpeciesModal({ open, species, onClose }: SpeciesModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!species;

  useEffect(() => {
    if (open) {
      if (species) {
        form.setFieldsValue(species);
      } else {
        form.resetFields();
        form.setFieldsValue({ active: true });
      }
    }
  }, [open, species, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateSpeciesRequest) => speciesApi.create(data),
    onSuccess: () => {
      message.success('Vrsta je dodata!');
      queryClient.invalidateQueries({ queryKey: ['species'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSpeciesRequest) => speciesApi.update(species!.id, data),
    onSuccess: () => {
      message.success('Vrsta je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['species'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateSpeciesRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Izmeni vrstu' : 'Dodaj vrstu'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Form.Item
          name='name'
          label='Naziv vrste'
          rules={[{ required: true, message: 'Unesite naziv vrste!' }]}
        >
          <Input placeholder='npr. Pas, Mačka, Ptica...' />
        </Form.Item>

        <Form.Item name='active' label='Aktivna' valuePropName='checked'>
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj vrstu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
