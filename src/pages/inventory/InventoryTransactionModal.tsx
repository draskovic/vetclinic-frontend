import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryTransactionsApi, inventoryItemsApi } from '../../api';
import type {
  InventoryTransaction,
  CreateInventoryTransactionRequest,
  UpdateInventoryTransactionRequest,
} from '../../types';

interface Props {
  open: boolean;
  transaction: InventoryTransaction | null;
  onClose: () => void;
}

export default function InventoryTransactionModal({ open, transaction, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => inventoryItemsApi.getAll(0, 1000).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryTransactionRequest) => inventoryTransactionsApi.create(data),
    onSuccess: () => {
      message.success('Transakcija kreirana');
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryTransactionRequest) =>
      inventoryTransactionsApi.update(transaction!.id, data),
    onSuccess: () => {
      message.success('Transakcija ažurirana');
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.setFieldsValue(transaction);
      } else {
        form.resetFields();
      }
    }
  }, [open, transaction, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (isEditing) {
        updateMutation.mutate(values);
      } else {
        createMutation.mutate(values);
      }
    });
  };

  return (
    <Modal
      title={isEditing ? 'Izmena transakcije' : 'Nova transakcija'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout='vertical' initialValues={{ type: 'IN', quantity: 1 }}>
        <Form.Item
          name='inventoryItemId'
          label='Artikal'
          rules={[{ required: true, message: 'Izaberite artikal' }]}
        >
          <Select showSearch optionFilterProp='children' placeholder='Izaberite artikal'>
            {items?.content?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} {item.sku ? `(${item.sku})` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name='type'
            label='Tip transakcije'
            rules={[{ required: true, message: 'Izaberite tip' }]}
          >
            <Select>
              <Select.Option value='IN'>Ulaz</Select.Option>
              <Select.Option value='OUT'>Izlaz</Select.Option>
              <Select.Option value='ADJUSTMENT'>Korekcija</Select.Option>
              <Select.Option value='EXPIRED'>Isteklo</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name='quantity'
            label='Količina'
            rules={[{ required: true, message: 'Unesite količinu' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
        </div>

        <Form.Item name='note' label='Napomena'>
          <Input.TextArea rows={3} placeholder='Razlog transakcije, dobavljač, referenca...' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
