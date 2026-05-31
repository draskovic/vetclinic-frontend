import { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Select,
  Input,
  Switch,
  Tag,
  Space,
  Popconfirm,
  message,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { petHealthAlertsApi } from '@/api/petHealthAlerts';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';
import { PET_HEALTH_ALERTS_KEYS } from '@/lib/queryKeySets';
import type { PetHealthAlert, HealthAlertType, CreatePetHealthAlertRequest } from '@/types';

interface Props {
  open: boolean;
  petId: string;
  petName?: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<HealthAlertType, string> = {
  ALLERGY: 'Alergija',
  CHRONIC_CONDITION: 'Hronična bolest',
  SPECIAL_HANDLING: 'Posebno postupanje',
  OTHER: 'Ostalo',
};

const TYPE_COLORS: Record<HealthAlertType, string> = {
  ALLERGY: 'red',
  CHRONIC_CONDITION: 'orange',
  SPECIAL_HANDLING: 'blue',
  OTHER: 'default',
};

export default function PetHealthAlertsEditorModal({ open, petId, petName, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // activeOnly=false → prikaži i deaktivirane (editor sme da reaktivira)
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['pet-health-alerts', petId, 'all'],
    queryFn: () => petHealthAlertsApi.getByPet(petId, false).then((r) => r.data),
    enabled: open && !!petId,
  });

  const resetForm = () => {
    form.resetFields();
    setEditingId(null);
  };

  const invalidate = () => {
    invalidateAndBroadcast(queryClient, [...PET_HEALTH_ALERTS_KEYS]);
    // i lokalni "all" ključ ovog modala
    queryClient.invalidateQueries({ queryKey: ['pet-health-alerts', petId, 'all'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreatePetHealthAlertRequest) => petHealthAlertsApi.create(data),
    onSuccess: () => {
      message.success('Upozorenje dodato');
      invalidate();
      resetForm();
    },
    onError: () => message.error('Greška pri dodavanju upozorenja'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePetHealthAlertRequest }) =>
      petHealthAlertsApi.update(id, data),
    onSuccess: () => {
      message.success('Upozorenje izmenjeno');
      invalidate();
      resetForm();
    },
    onError: () => message.error('Greška pri izmeni upozorenja'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => petHealthAlertsApi.delete(id),
    onSuccess: () => {
      message.success('Upozorenje obrisano');
      invalidate();
      if (editingId) resetForm();
    },
    onError: () => message.error('Greška pri brisanju upozorenja'),
  });

  const handleEdit = (alert: PetHealthAlert) => {
    setEditingId(alert.id);
    form.setFieldsValue({
      alertType: alert.alertType,
      label: alert.label,
      description: alert.description,
      active: alert.active,
    });
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload: CreatePetHealthAlertRequest = {
        petId,
        alertType: values.alertType,
        label: values.label.trim(),
        description: values.description?.trim() || null,
        active: values.active ?? true,
      };
      if (editingId) {
        updateMutation.mutate({ id: editingId, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const columns = [
    {
      title: 'Tip',
      dataIndex: 'alertType',
      key: 'alertType',
      render: (t: HealthAlertType) => <Tag color={TYPE_COLORS[t]}>{TYPE_LABELS[t]}</Tag>,
    },

    {
      title: 'Naziv',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => d || <Typography.Text type='secondary'>—</Typography.Text>,
    },
    {
      title: 'Aktivno',
      dataIndex: 'active',
      key: 'active',
      render: (a: boolean) => (a ? <Tag color='green'>Da</Tag> : <Tag color='default'>Ne</Tag>),
    },
    {
      title: 'Akcije',
      key: 'actions',
      render: (_: unknown, record: PetHealthAlert) => (
        <Space>
          <Button size='small' icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title='Obrisati upozorenje?'
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText='Obriši'
            cancelText='Otkaži'
          >
            <Button size='small' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Upozorenja${petName ? ` — ${petName}` : ''}`}
      open={open}
      onCancel={() => {
        resetForm();
        onClose();
      }}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Table
        rowKey='id'
        size='small'
        loading={isLoading}
        columns={columns}
        dataSource={alerts}
        pagination={false}
        style={{ marginBottom: 16 }}
        locale={{ emptyText: 'Nema unetih upozorenja' }}
      />

      <Typography.Title level={5}>
        {editingId ? 'Izmena upozorenja' : 'Dodaj upozorenje'}
      </Typography.Title>

      <Form form={form} layout='vertical' initialValues={{ alertType: 'ALLERGY', active: true }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name='alertType'
            label='Tip'
            rules={[{ required: true, message: 'Izaberite tip' }]}
          >
            <Select>
              {(Object.keys(TYPE_LABELS) as HealthAlertType[]).map((t) => (
                <Select.Option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name='label'
          label='Naziv'
          rules={[
            { required: true, message: 'Unesite naziv upozorenja' },
            { max: 200, message: 'Maksimalno 200 karaktera' },
          ]}
        >
          <Input placeholder='npr. Penicilin, Diabetes mellitus, Agresivan...' />
        </Form.Item>

        <Form.Item name='description' label='Opis (opciono)'>
          <Input.TextArea rows={2} placeholder='Dodatne informacije...' />
        </Form.Item>

        <Form.Item name='active' label='Aktivno' valuePropName='checked'>
          <Switch />
        </Form.Item>

        <Space>
          <Button
            type='primary'
            icon={editingId ? <EditOutlined /> : <PlusOutlined />}
            onClick={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? 'Sačuvaj izmene' : 'Dodaj'}
          </Button>
          {editingId && <Button onClick={resetForm}>Otkaži izmenu</Button>}
        </Space>
      </Form>
    </Modal>
  );
}
