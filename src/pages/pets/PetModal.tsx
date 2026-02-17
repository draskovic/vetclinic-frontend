import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  DatePicker,
  Switch,
  InputNumber,
  Row,
  Col,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '@/api/pets';
import { ownersApi } from '@/api/owners';
import { speciesApi } from '@/api/species';
import { breedsApi } from '@/api/breeds';
import type { Pet, CreatePetRequest, UpdatePetRequest } from '@/types';
import dayjs from 'dayjs';

interface PetModalProps {
  open: boolean;
  pet: Pet | null;
  onClose: () => void;
}

const genderOptions = [
  { label: 'Muški', value: 'MALE' },
  { label: 'Ženski', value: 'FEMALE' },
  { label: 'Nepoznat', value: 'UNKNOWN' },
];

export default function PetModal({ open, pet, onClose }: PetModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!pet;
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

  const { data: ownersData } = useQuery({
    queryKey: ['owners-all'],
    queryFn: () => ownersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: speciesData } = useQuery({
    queryKey: ['species'],
    queryFn: () => speciesApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: breedsData } = useQuery({
    queryKey: ['breeds-by-species', selectedSpeciesId],
    queryFn: () => breedsApi.getBySpecies(selectedSpeciesId!).then((r) => r.data),
    enabled: !!selectedSpeciesId,
  });

  useEffect(() => {
    if (open) {
      if (pet) {
        setSelectedSpeciesId(pet.speciesId);
        form.setFieldsValue({
          ...pet,
          dateOfBirth: pet.dateOfBirth ? dayjs(pet.dateOfBirth) : null,
          deceasedAt: pet.deceasedAt ? dayjs(pet.deceasedAt) : null,
          breedId: null, // will be set when breeds load
        });
      } else {
        form.resetFields();
        setSelectedSpeciesId(null);
      }
    }
  }, [open, pet, form]);

  useEffect(() => {
    if (open && pet?.breedId && breedsData) {
      // Use setTimeout to ensure this runs after the form reset
      setTimeout(() => {
        form.setFieldValue('breedId', pet.breedId);
      }, 0);
    }
  }, [open, pet, breedsData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePetRequest) => petsApi.create(data),
    onSuccess: () => {
      message.success('Ljubimac je dodat!');
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      onClose();
    },
    onError: () => message.error('Greška pri dodavanju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePetRequest) => petsApi.update(pet!.id, data),
    onSuccess: () => {
      message.success('Ljubimac je izmenjen!');
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = (
    values: CreatePetRequest & { dateOfBirth?: dayjs.Dayjs; deceasedAt?: dayjs.Dayjs },
  ) => {
    const payload = {
      ...values,
      isNeutered: values.isNeutered ?? false,
      isDeceased: values.isDeceased ?? false,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
      deceasedAt: values.deceasedAt ? values.deceasedAt.format('YYYY-MM-DD') : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const ownerOptions =
    ownersData?.content.map((o) => ({
      label: `${o.firstName} ${o.lastName}`,
      value: o.id,
    })) ?? [];

  const speciesOptions =
    speciesData?.content.map((s) => ({
      label: s.name,
      value: s.id,
    })) ?? [];

  const breedOptions =
    breedsData?.map((b) => ({
      label: b.name,
      value: b.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni ljubimca' : 'Dodaj ljubimca'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={900}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name='name'
              label='Ime ljubimca'
              rules={[{ required: true, message: 'Unesite ime!' }]}
            >
              <Input placeholder='Ime ljubimca' />
            </Form.Item>
          </Col>
          <Col span={8}>
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
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='speciesId' label='Vrsta'>
              <Select
                placeholder='Izaberite vrstu...'
                options={speciesOptions}
                showSearch
                allowClear
                onChange={(val) => {
                  setSelectedSpeciesId(val);
                  form.setFieldValue('breedId', undefined);
                }}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name='breedId' label='Rasa'>
              <Select
                placeholder='Izaberite rasu...'
                options={breedOptions}
                showSearch
                allowClear
                disabled={!selectedSpeciesId}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='dateOfBirth' label='Datum rođenja'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='gender' label='Pol'>
              <Select placeholder='Izaberite pol...' options={genderOptions} allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name='weightKg' label='Težina (kg)'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder='0.0' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='color' label='Boja'>
              <Input placeholder='Boja krzna/perja...' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='microchipNumber' label='Broj mikročipa'>
              <Input placeholder='Broj mikročipa' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name='isNeutered' label='Kastriran/a' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='isDeceased' label='Preminuo/la' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='deceasedAt' label='Datum smrti'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='allergies' label='Alergije'>
              <Input.TextArea placeholder='Poznate alergije...' rows={2} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='note' label='Napomena'>
              <Input.TextArea placeholder='Napomena...' rows={2} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Dodaj ljubimca'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
