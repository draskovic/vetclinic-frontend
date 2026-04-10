import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Row,
  Col,
  message,
  Table,
  Popconfirm,
  Divider,
  Typography,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicesApi, serviceInventoryItemsApi, inventoryItemsApi } from '@/api';
import type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceCategory,
  ServiceInventoryItem,
} from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  // --- Inventar mapiranje ---
  const [itemSearch, setItemSearch] = useState('');
  const debouncedItemSearch = useDebouncedValue(itemSearch, 300);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [qtyPerUse, setQtyPerUse] = useState<number>(1);

  const { data: linkedItems, refetch: refetchLinked } = useQuery({
    queryKey: ['service-inventory-items', service?.id],
    queryFn: () => serviceInventoryItemsApi.getByService(service!.id),
    enabled: !!service?.id,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-items-search', debouncedItemSearch],
    queryFn: () => inventoryItemsApi.getAll(0, 20, debouncedItemSearch || undefined),
  });

  const inventoryOptions = useMemo(
    () =>
      inventoryData?.data?.content.map((i) => ({
        label: `${i.sku ? i.sku + ' — ' : ''}${i.name}${i.unit ? ' (' + i.unit + ')' : ''}`,
        value: i.id,
      })) ?? [],
    [inventoryData],
  );

  const createLinkMutation = useMutation({
    mutationFn: () =>
      serviceInventoryItemsApi.create({
        serviceId: service!.id,
        inventoryItemId: selectedItemId!,
        quantityPerUse: qtyPerUse,
      }),
    onSuccess: () => {
      message.success('Artikal povezan sa uslugom');
      refetchLinked();
      setSelectedItemId(null);
      setQtyPerUse(1);
      setItemSearch('');
    },
    onError: () => message.error('Greška pri povezivanju'),
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ id, quantityPerUse }: { id: string; quantityPerUse: number }) =>
      serviceInventoryItemsApi.update(id, { quantityPerUse }),
    onSuccess: () => refetchLinked(),
    onError: () => message.error('Greška pri izmeni'),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: string) => serviceInventoryItemsApi.delete(id),
    onSuccess: () => {
      message.success('Veza uklonjena');
      refetchLinked();
    },
    onError: () => message.error('Greška pri brisanju'),
  });

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
          <Col span={3}>
            <Form.Item name='sku' label='Šifra'>
              <Input placeholder='npr. 1001' />
            </Form.Item>
          </Col>
          <Col span={11}>
            <Form.Item
              name='name'
              label='Naziv usluge'
              rules={[{ required: true, message: 'Unesite naziv usluge' }]}
            >
              <Input placeholder='npr. Opšti pregled, Vakcinacija, Kastracija...' />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='unit' label='Jed. mere'>
              <Input placeholder='npr. tab, kut' />
            </Form.Item>
          </Col>
          <Col span={5}>
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
      {isEditing && (
        <>
          <Divider style={{ margin: '16px 0 8px' }} />
          <Typography.Text strong>Povezani artikli inventara</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Row gutter={8} style={{ marginBottom: 8 }}>
              <Col flex='auto'>
                <Select
                  placeholder='Izaberi artikal inventara...'
                  options={inventoryOptions}
                  showSearch
                  filterOption={false}
                  onSearch={(value) => setItemSearch(value)}
                  value={selectedItemId}
                  onChange={(val) => setSelectedItemId(val)}
                  style={{ width: '100%' }}
                  onInputKeyDown={(e) => {
                    if (e.key === ' ') e.stopPropagation();
                  }}
                  allowClear
                />
              </Col>
              <Col>
                <InputNumber
                  min={0.01}
                  value={qtyPerUse}
                  onChange={(val) => setQtyPerUse(val ?? 1)}
                  style={{ width: 80 }}
                  precision={2}
                  placeholder='Kol.'
                />
              </Col>
              <Col>
                <Button
                  type='primary'
                  onClick={() => createLinkMutation.mutate()}
                  disabled={!selectedItemId}
                  loading={createLinkMutation.isPending}
                >
                  Dodaj
                </Button>
              </Col>
            </Row>
            <Table
              dataSource={linkedItems?.data ?? []}
              rowKey='id'
              pagination={false}
              size='small'
              columns={[
                {
                  title: 'Artikal',
                  dataIndex: 'inventoryItemName',
                },
                {
                  title: 'Količina',
                  dataIndex: 'quantityPerUse',
                  width: 100,
                  render: (val: number, record: ServiceInventoryItem) => (
                    <InputNumber
                      min={0.01}
                      value={val}
                      size='small'
                      precision={2}
                      style={{ width: 80 }}
                      onChange={(newVal) => {
                        if (newVal && newVal !== val) {
                          updateLinkMutation.mutate({ id: record.id, quantityPerUse: newVal });
                        }
                      }}
                    />
                  ),
                },
                {
                  title: 'Jed.',
                  dataIndex: 'unit',
                  width: 60,
                  render: (val: string) => val || '—',
                },
                {
                  title: '',
                  key: 'actions',
                  width: 50,
                  render: (_: unknown, record: ServiceInventoryItem) => (
                    <Popconfirm
                      title='Ukloniti vezu?'
                      onConfirm={() => deleteLinkMutation.mutate(record.id)}
                    >
                      <Button type='text' danger icon={<DeleteOutlined />} size='small' />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
