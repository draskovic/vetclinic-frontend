import { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { breedsApi } from '@/api/breeds';
import { speciesApi } from '@/api/species';
import type { Breed, CreateBreedRequest, UpdateBreedRequest } from '@/types';

interface BreedModalProps {
  open: boolean;
  breed: Breed | null;
  onClose: () => void;
}

export default function BreedModal({ open, breed, onClose }: BreedModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!breed;

  const { data: speciesData } = useQuery({
    queryKey: ['species'],
    queryFn: () => speciesApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (breed) {
        form.setFieldsValue(breed);
      } else {
        form.resetFields();
      }
    }
  }, [open, breed, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateBreedRequest) => breedsApi.create(data),
    onSuccess: () => {
      message.success('Rasa je dodata!');
      queryClient.invalidateQueries({ queryKey: ['breeds'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBreedRequest) => breedsApi.update(breed!.id, data),
    onSuccess: () => {
      message.success('Rasa je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['breeds'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (values: CreateBreedRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const speciesOptions =
    speciesData?.content.map((s) => ({
      label: s.name,
      value: s.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni rasu' : 'Dodaj rasu'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Form.Item
          name='speciesId'
          label='Vrsta životinje'
          rules={[{ required: true, message: 'Izaberite vrstu!' }]}
        >
          <Select
            placeholder='Izaberite vrstu...'
            options={speciesOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name='name'
          label='Naziv rase'
          rules={[{ required: true, message: 'Unesite naziv rase!' }]}
        >
          <Input placeholder='npr. Labrador, Perzijska, Kanarinka...' />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj rasu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
