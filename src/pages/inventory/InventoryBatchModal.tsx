import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { inventoryBatchesApi } from '../../api';
import type {
  InventoryBatch,
  CreateInventoryBatchRequest,
  UpdateInventoryBatchRequest,
} from '../../types';

import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface Props {
  open: boolean;
  inventoryItemId: string;
  batch: InventoryBatch | null;
  onClose: () => void;
}

export default function InventoryBatchModal({ open, inventoryItemId, batch, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!batch;

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryBatchRequest) => inventoryBatchesApi.create(data),
    onSuccess: async () => {
      message.success('Lot kreiran');
      invalidateAndBroadcast(queryClient, [
        ['inventory-batches', inventoryItemId],
        ['inventory-batches'],
        ['inventory-items'],
        ['inventory-item', inventoryItemId],
        ['inventory-item'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
      onClose();
    },

    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Greška pri kreiranju lota');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryBatchRequest) => inventoryBatchesApi.update(batch!.id, data),
    onSuccess: async () => {
      message.success('Lot ažuriran');
      invalidateAndBroadcast(queryClient, [
        ['inventory-batches', inventoryItemId],
        ['inventory-batches'],
        ['inventory-batches-expiring'],
      ]);
      onClose();
    },

    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Greška pri izmeni lota');
    },
  });

  useEffect(() => {
    if (open) {
      if (batch) {
        form.setFieldsValue({
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate ? dayjs(batch.expiryDate) : null,
          quantityOnHand: batch.quantityOnHand,
          receivedAt: batch.receivedAt ? dayjs(batch.receivedAt) : dayjs(),
          supplier: batch.supplier,
          costPrice: batch.costPrice,
          notes: batch.notes,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          receivedAt: dayjs(),
          quantityOnHand: 0,
        });
      }
    }
  }, [open, batch, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const base = {
        batchNumber: values.batchNumber,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        receivedAt: values.receivedAt.format('YYYY-MM-DD'),
        supplier: values.supplier,
        costPrice: values.costPrice,
        notes: values.notes,
      };

      if (isEditing) {
        updateMutation.mutate(base);
      } else {
        createMutation.mutate({
          ...base,
          inventoryItemId,
          quantityOnHand: values.quantityOnHand,
        });
      }
    });
  };

  return (
    <Modal
      title={isEditing ? 'Izmena lota' : 'Novi lot'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='batchNumber'
          label='Broj lota'
          rules={[{ required: true, message: 'Unesite broj lota' }]}
        >
          <Input placeholder='npr. LOT-2026-A' />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='expiryDate' label='Rok trajanja'>
            <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>

          <Form.Item
            name='receivedAt'
            label='Datum prijema'
            rules={[{ required: true, message: 'Datum prijema je obavezan' }]}
          >
            <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>
        </div>

        <Form.Item
          name='quantityOnHand'
          label='Količina'
          tooltip={isEditing ? 'Količina se menja kroz IN/OUT transakcije, ne direktno' : undefined}
          rules={
            isEditing
              ? []
              : [
                  { required: true, message: 'Unesite količinu' },
                  {
                    validator: (_, value) =>
                      value >= 0 ? Promise.resolve() : Promise.reject('Količina mora biti >= 0'),
                  },
                ]
          }
        >
          <InputNumber style={{ width: '100%' }} min={0} disabled={isEditing} />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='supplier' label='Dobavljač'>
            <Input />
          </Form.Item>

          <Form.Item name='costPrice' label='Nabavna cena (po jedinici)'>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
        </div>

        <Form.Item name='notes' label='Napomena'>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
