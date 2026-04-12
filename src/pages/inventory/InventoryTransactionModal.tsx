import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryTransactionsApi, inventoryItemsApi } from '../../api';
import type {
  InventoryTransaction,
  CreateInventoryTransactionRequest,
  UpdateInventoryTransactionRequest,
  AdjustmentReason,
} from '../../types';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface Props {
  open: boolean;
  transaction: InventoryTransaction | null;
  onClose: () => void;
  defaultItemId?: string;
}

export default function InventoryTransactionModal({
  open,
  transaction,
  onClose,
  defaultItemId,
}: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;
  const selectedType = Form.useWatch('type', form);
  const requiresReason = selectedType === 'ADJUSTMENT' || selectedType === 'EXPIRED';

  const reasonLabels: Record<AdjustmentReason, string> = {
    DAMAGED: 'Oštećeno',
    LOST: 'Izgubljeno',
    STOLEN: 'Ukradeno',
    EXPIRED: 'Isteklo',
    RECOUNT: 'Popis (neslaganje)',
    CORRECTION: 'Korekcija unosa',
    OPENING_BALANCE: 'Otvaranje kartice',
    OTHER: 'Ostalo',
  };

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => inventoryItemsApi.getAll(0, 1000).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryTransactionRequest) => inventoryTransactionsApi.create(data),
    onSuccess: () => {
      message.success('Transakcija kreirana');
      invalidateAndBroadcast(queryClient, [
        ['inventory-transactions'],
        ['inventory-transactions-by-item'],
        ['inventory-items'],
        ['inventory-item'],
        ['inventory-batches'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryTransactionRequest) =>
      inventoryTransactionsApi.update(transaction!.id, data),
    onSuccess: () => {
      message.success('Transakcija ažurirana');
      invalidateAndBroadcast(queryClient, [
        ['inventory-transactions'],
        ['inventory-transactions-by-item'],
        ['inventory-items'],
        ['inventory-item'],
        ['inventory-batches'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.setFieldsValue(transaction);
      } else {
        form.resetFields();
        if (defaultItemId) {
          form.setFieldsValue({ inventoryItemId: defaultItemId });
        }
      }
    }
  }, [open, transaction, form, defaultItemId]);

  useEffect(() => {
    if (!requiresReason) {
      form.setFieldValue('reason', undefined);
    }
  }, [requiresReason, form]);

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

        {requiresReason && (
          <Form.Item
            name='reason'
            label='Razlog'
            rules={[{ required: true, message: 'Izaberite razlog za korekciju/isteklo' }]}
          >
            <Select placeholder='Izaberite razlog'>
              {(Object.keys(reasonLabels) as AdjustmentReason[]).map((key) => (
                <Select.Option key={key} value={key}>
                  {reasonLabels[key]}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name='note' label='Napomena'>
          <Input.TextArea rows={3} placeholder='Razlog transakcije, dobavljač, referenca...' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
