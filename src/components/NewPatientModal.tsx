import { useState } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Radio,
  Row,
  Col,
  DatePicker,
  Switch,
  InputNumber,
  message,
  Typography,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ownersApi } from '@/api/owners';
import { petsApi } from '@/api/pets';
import { speciesApi } from '@/api/species';
import { breedsApi } from '@/api/breeds';
import type { CreateOwnerRequest, CreatePetRequest, Owner } from '@/types';

const { Text } = Typography;

interface NewPatientModalProps {
  open: boolean;
  onClose: () => void;
}

const genderOptions = [
  { label: 'Muški', value: 'MALE' },
  { label: 'Ženski', value: 'FEMALE' },
  { label: 'Nepoznat', value: 'UNKNOWN' },
];

export default function NewPatientModal({ open, onClose }: NewPatientModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [ownerMode, setOwnerMode] = useState<'new' | 'existing'>('new');
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

  const [ownerForm] = Form.useForm();
  const [petForm] = Form.useForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Queries
  const { data: ownersData } = useQuery({
    queryKey: ['owners-all'],
    queryFn: () => ownersApi.getAll(0, 100).then((r) => r.data),
    enabled: open,
  });

  const { data: speciesData } = useQuery({
    queryKey: ['species'],
    queryFn: () => speciesApi.getAll(0, 100).then((r) => r.data),
    enabled: open && currentStep === 1,
  });

  const { data: breedsData } = useQuery({
    queryKey: ['breeds-by-species', selectedSpeciesId],
    queryFn: () => breedsApi.getBySpecies(selectedSpeciesId!).then((r) => r.data),
    enabled: !!selectedSpeciesId,
  });

  // Mutations
  const createOwnerMutation = useMutation({
    mutationFn: (data: CreateOwnerRequest) => ownersApi.create(data),
  });

  const createPetMutation = useMutation({
    mutationFn: (data: CreatePetRequest) => petsApi.create(data),
  });

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

  const handleNext = async () => {
    if (ownerMode === 'new') {
      try {
        const values = await ownerForm.validateFields();
        const response = await createOwnerMutation.mutateAsync(values);
        setSelectedOwner(response.data);
        message.success('Vlasnik kreiran!');
        setCurrentStep(1);
      } catch (error: any) {
        if (error?.errorFields) return; // validation error
        message.error('Greška pri kreiranju vlasnika!');
      }
    } else {
      // existing owner
      const existingOwnerId = ownerForm.getFieldValue('existingOwnerId');
      if (!existingOwnerId) {
        message.warning('Izaberite vlasnika!');
        return;
      }
      const owner = ownersData?.content.find((o) => o.id === existingOwnerId);
      if (owner) {
        setSelectedOwner(owner);
        setCurrentStep(1);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedOwner) return;
    try {
      const values = await petForm.validateFields();
      const payload = {
        ...values,
        ownerId: selectedOwner.id,
        isNeutered: values.isNeutered ?? false,
        isDeceased: values.isDeceased ?? false,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
      };
      const response = await createPetMutation.mutateAsync(payload);
      message.success('Ljubimac dodat!');
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      handleReset();
      onClose();
      navigate(`/pets/${response.data.id}`);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('Greška pri dodavanju ljubimca!');
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setOwnerMode('new');
    setSelectedOwner(null);
    setSelectedSpeciesId(null);
    ownerForm.resetFields();
    petForm.resetFields();
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      title='Nov pacijent'
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
      width={700}
    >
      <Steps
        current={currentStep}
        items={[{ title: 'Vlasnik' }, { title: 'Ljubimac' }]}
        style={{ marginBottom: 24 }}
      />

      {/* Step 1: Vlasnik */}
      {currentStep === 0 && (
        <Form form={ownerForm} layout='vertical'>
          <Radio.Group
            value={ownerMode}
            onChange={(e) => setOwnerMode(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <Radio.Button value='new'>Novi vlasnik</Radio.Button>
            <Radio.Button value='existing'>Postojeći vlasnik</Radio.Button>
          </Radio.Group>

          {ownerMode === 'new' ? (
            <>
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
            </>
          ) : (
            <Form.Item
              name='existingOwnerId'
              label='Izaberite vlasnika'
              rules={[{ required: true, message: 'Izaberite vlasnika!' }]}
            >
              <Select
                placeholder='Pretražite po imenu...'
                options={ownerOptions}
                showSearch
                optionFilterProp='label'
              />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Otkaži
            </Button>
            <Button type='primary' onClick={handleNext} loading={createOwnerMutation.isPending}>
              Dalje
            </Button>
          </div>
        </Form>
      )}

      {/* Step 2: Ljubimac */}
      {currentStep === 1 && (
        <Form form={petForm} layout='vertical'>
          <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
            Vlasnik:{' '}
            <strong>
              {selectedOwner?.firstName} {selectedOwner?.lastName}
            </strong>
            {' — '}
            <a onClick={() => setCurrentStep(0)}>Nazad</a>
          </Text>

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
              <Form.Item name='speciesId' label='Vrsta'>
                <Select
                  placeholder='Izaberite vrstu...'
                  options={speciesOptions}
                  showSearch
                  allowClear
                  optionFilterProp='label'
                  onChange={(val) => {
                    setSelectedSpeciesId(val);
                    petForm.setFieldValue('breedId', undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='breedId' label='Rasa'>
                <Select
                  placeholder='Izaberite rasu...'
                  options={breedOptions}
                  showSearch
                  allowClear
                  disabled={!selectedSpeciesId}
                  optionFilterProp='label'
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col span={8}>
              <Form.Item name='weightKg' label='Težina (kg)'>
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder='0.0' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col span={8}>
              <Form.Item name='isNeutered' label='Kastriran/a' valuePropName='checked'>
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Otkaži
            </Button>
            <Button type='primary' onClick={handleSave} loading={createPetMutation.isPending}>
              Sačuvaj
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
