import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Switch, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryItemsApi } from '../../api';
import { clinicLocationsApi } from '../../api/clinic-locations';
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from '../../types';
import dayjs from 'dayjs';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface Props {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

export default function InventoryItemModal({ open, item, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const { data: locations } = useQuery({
    queryKey: ['clinic-locations'],
    queryFn: () => clinicLocationsApi.getActive().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryItemRequest) => inventoryItemsApi.create(data),
    onSuccess: () => {
      message.success('Artikal kreiran');
      invalidateAndBroadcast(queryClient, [['inventory-items'], ['dashboard-low-stock']]);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryItemRequest) => inventoryItemsApi.update(item!.id, data),
    onSuccess: () => {
      message.success('Artikal ažuriran');
      invalidateAndBroadcast(queryClient, [
        ['inventory-items'],
        ['inventory-item', item!.id],
        ['inventory-item'],
        ['dashboard-low-stock'],
      ]);
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.setFieldsValue({
          ...item,
          expiryDate: item.expiryDate ? dayjs(item.expiryDate) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, item, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload = {
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        locationId: values.locationId ?? null,
      };

      if (isEditing) {
        updateMutation.mutate(payload);
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  return (
    <Modal
      title={isEditing ? 'Izmena artikla' : 'Novi artikal'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          active: true,
          category: 'MEDICATION',
          quantityOnHand: 0,
          reorderLevel: 0,
          trackBatches: false,
        }}
      >
        <Form.Item name='name' label='Naziv' rules={[{ required: true, message: 'Unesite naziv' }]}>
          <Input />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='sku' label='SKU'>
            <Input />
          </Form.Item>

          <Form.Item
            name='category'
            label='Kategorija'
            rules={[{ required: true, message: 'Izaberite kategoriju' }]}
          >
            <Select>
              <Select.Option value='MEDICATION'>Lek</Select.Option>
              <Select.Option value='SUPPLY'>Potrošni materijal</Select.Option>
              <Select.Option value='EQUIPMENT'>Oprema</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name='quantityOnHand' label='Količina na stanju'>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item name='unit' label='Jedinica mere'>
            <Input placeholder='kom, ml, g...' />
          </Form.Item>

          <Form.Item name='reorderLevel' label='Min. nivo za narudžbu'>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='costPrice' label='Nabavna cena'>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>

          <Form.Item name='sellPrice' label='Prodajna cena'>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='expiryDate' label='Rok trajanja'>
            <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>

          <Form.Item name='locationId' label='Lokacija'>
            <Select allowClear placeholder='Izaberite lokaciju'>
              {locations?.map((loc) => (
                <Select.Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='active' label='Aktivan' valuePropName='checked'>
            <Switch />
          </Form.Item>

          <Form.Item
            name='trackBatches'
            label='Prati po lotovima (FIFO)'
            valuePropName='checked'
            tooltip='Lotovi se troše po roku trajanja — najpre ističu, najpre se troše'
          >
            <Switch />
          </Form.Item>
        </div>

        <Form.Item shouldUpdate={(prev, curr) => prev.trackBatches !== curr.trackBatches} noStyle>
          {({ getFieldValue }) =>
            getFieldValue('trackBatches') ? (
              <div
                style={{
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  padding: 8,
                  borderRadius: 4,
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#874d00',
                }}
              >
                Količina na stanju će se računati kao zbir količina svih lotova. Lotove dodaješ
                kasnije iz tab-a "Lotovi" na detaljnoj stranici artikla.
              </div>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
