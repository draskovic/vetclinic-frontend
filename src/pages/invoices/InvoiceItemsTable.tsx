import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  InputNumber,
  Form,
  Typography,
  Tooltip,
  Tag,
} from 'antd';
import { DeleteOutlined, SaveOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceItemsApi } from '@/api/invoices';
import type {
  InvoiceItem,
  CreateInvoiceItemRequest,
  UpdateInvoiceItemRequest,
  BillableItem,
} from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { INVENTORY_FULL_KEYS } from '@/lib/queryKeySets';
import BillableItemPicker from '../../components/BillableItemPicker';

interface Props {
  invoiceId: string;
  onItemsChanged?: (items: InvoiceItem[]) => void;
  readOnly?: boolean;
}

export default function InvoiceItemsTable({ invoiceId, onItemsChanged, readOnly = false }: Props) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: () => invoiceItemsApi.getByInvoice(invoiceId).then((r) => r.data),
  });

  useEffect(() => {
    if (items && onItemsChanged) {
      onItemsChanged(items);
    }
  }, [items]);

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceItemRequest) => invoiceItemsApi.create(data),
    onSuccess: (_data, variables) => {
      message.success('Stavka dodata');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
      if (variables.inventoryItemId) {
        // dodat artikal → lager se promenio (auto-OUT)
        INVENTORY_FULL_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      }
    },
    onError: () => message.error('Greška pri dodavanju stavke'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceItemRequest; isItem?: boolean }) =>
      invoiceItemsApi.update(id, data),
    onSuccess: (_data, variables) => {
      message.success('Stavka izmenjena');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
      if (variables.isItem) {
        // izmena qty artikla → lager se koriguje (R3a)
        INVENTORY_FULL_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      }
      setEditingId(null);
    },
    onError: () => message.error('Greška pri izmeni stavke'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceItemsApi.delete(id),
    onSuccess: (_data, id) => {
      message.success('Stavka obrisana');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
      // ako je obrisan artikal → lager se vratio; jeftino je invalidirati uvek
      INVENTORY_FULL_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      void id;
    },
  });

  const calculateLineTotal = () => {
    const quantity = form.getFieldValue('quantity') ?? 1;
    const unitPrice = form.getFieldValue('unitPrice') ?? 0;
    const taxRatePercent = form.getFieldValue('taxRatePercent') ?? 0;
    const discountPercent = form.getFieldValue('discountPercent') ?? 0;
    const base = quantity * unitPrice;
    const discount = base * (discountPercent / 100);
    const subtotal = base - discount;
    const tax = subtotal * (taxRatePercent / 100);
    const lineTotal = +(subtotal + tax).toFixed(2);
    form.setFieldValue('lineTotal', lineTotal);
  };

  const handleAddBillable = (item: BillableItem) => {
    const unitPrice = item.unitPrice ?? 0;
    const taxPercent = item.taxRatePercent ?? 0;
    const lineTotal = +(unitPrice * (1 + taxPercent / 100)).toFixed(2); // qty=1, popust=0; backend ionako rekomputira
    createMutation.mutate({
      invoiceId,
      serviceId: item.type === 'SERVICE' ? item.id : null,
      inventoryItemId: item.type === 'ITEM' ? item.id : null,
      description: item.name,
      quantity: 1,
      unitPrice,
      taxRateId: item.taxRateId,
      discountPercent: 0,
      lineTotal,
      sortOrder: (items?.length ?? 0) + 1,
    });
  };

  const startEditing = (record: InvoiceItem) => {
    setEditingId(record.id);
    form.setFieldsValue({
      description: record.description,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      taxRateId: record.taxRateId,
      taxRateLabel: record.taxRateLabel,
      taxRatePercent: record.taxRatePercent,
      discountPercent: record.discountPercent,
      lineTotal: record.lineTotal,
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    const isItem = !!items?.find((i) => i.id === editingId)?.inventoryItemId;
    form.validateFields().then((values) => {
      updateMutation.mutate({ id: editingId, data: values, isItem });
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    form.resetFields();
  };

  const isRowEditing = (record: InvoiceItem) => record.id === editingId;

  const rowLockReason = (record: InvoiceItem): string => {
    if (readOnly) return 'Faktura je zaključena — stavke se ne mogu menjati';
    if (record.treatmentId) return 'Stavka iz kartona — izmena ide kroz intervenciju (karton)';
    return '';
  };

  const columns: ColumnsType<InvoiceItem> = [
    {
      title: 'Stavka',
      dataIndex: 'description',
      render: (val: string, record) =>
        record.treatmentId ? (
          <Space size={4}>
            <Tag color='blue'>Iz kartona</Tag>
            <span>{val}</span>
          </Space>
        ) : (
          val
        ),
    },
    {
      title: 'Količina',
      dataIndex: 'quantity',
      width: 70,
      align: 'right',
      render: (val: number, record) =>
        isRowEditing(record) ? (
          <Form.Item name='quantity' style={{ margin: 0 }}>
            <InputNumber
              min={0.01}
              step={1}
              style={{ width: '100%' }}
              onChange={calculateLineTotal}
            />
          </Form.Item>
        ) : (
          val
        ),
    },
    {
      title: 'Jed.cena',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (val: number, record) =>
        isRowEditing(record) ? (
          <Form.Item
            name='unitPrice'
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Obavezno' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              onChange={calculateLineTotal}
            />
          </Form.Item>
        ) : (
          val?.toFixed(2)
        ),
    },
    {
      title: 'PDV',
      dataIndex: 'taxRateLabel',
      width: 85,
      align: 'right',
      render: (_label: string | null, record) => {
        if (isRowEditing(record)) {
          const formLabel = form.getFieldValue('taxRateLabel') as string | undefined;
          const formPercent = form.getFieldValue('taxRatePercent') as number | undefined;
          return formLabel ? (
            `${formLabel} (${formPercent ?? 0}%)`
          ) : (
            <Typography.Text type='secondary'>auto</Typography.Text>
          );
        }
        return `${record.taxRateLabel ?? '—'} (${record.taxRatePercent ?? 0}%)`;
      },
    },
    {
      title: 'Popust %',
      dataIndex: 'discountPercent',
      width: 80,
      align: 'right',
      render: (val: number, record) =>
        isRowEditing(record) ? (
          <Form.Item name='discountPercent' style={{ margin: 0 }}>
            <InputNumber
              min={0}
              max={100}
              step={1}
              style={{ width: '100%' }}
              onChange={calculateLineTotal}
            />
          </Form.Item>
        ) : (
          `${val}%`
        ),
    },
    {
      title: 'Ukupno',
      dataIndex: 'lineTotal',
      width: 120,
      align: 'right',
      render: (val: number, record) =>
        isRowEditing(record) ? (
          <Form.Item name='lineTotal' style={{ margin: 0 }}>
            <InputNumber style={{ width: '100%' }} precision={2} disabled />
          </Form.Item>
        ) : (
          <strong>{val?.toFixed(2)}</strong>
        ),
    },
    {
      title: '',
      width: 80,
      render: (_: unknown, record) => {
        const lockReason = rowLockReason(record);
        const locked = !!lockReason;
        return isRowEditing(record) ? (
          <Space>
            <Button icon={<SaveOutlined />} size='small' type='primary' onClick={handleSave} />
            <Button icon={<CloseOutlined />} size='small' onClick={handleCancel} />
          </Space>
        ) : (
          <Space>
            <Tooltip title={lockReason}>
              <Button
                icon={<EditOutlined />}
                size='small'
                onClick={() => startEditing(record)}
                disabled={locked || !!editingId}
              />
            </Tooltip>
            <Tooltip title={lockReason}>
              <Popconfirm
                title='Obrisati stavku?'
                onConfirm={() => deleteMutation.mutate(record.id)}
                disabled={locked}
              >
                <Button
                  icon={<DeleteOutlined />}
                  size='small'
                  danger
                  disabled={locked || !!editingId}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const grandTotal = items?.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0) ?? 0;

  return (
    <Form form={form}>
      <Form.Item name='description' hidden>
        <input type='hidden' />
      </Form.Item>
      <Form.Item name='taxRateId' hidden>
        <input type='hidden' />
      </Form.Item>
      <Form.Item name='taxRateLabel' hidden>
        <input type='hidden' />
      </Form.Item>
      <Form.Item name='taxRatePercent' hidden>
        <input type='hidden' />
      </Form.Item>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          gap: 12,
        }}
      >
        <Typography.Text strong>Stavke fakture</Typography.Text>
        {!readOnly && (
          <div style={{ minWidth: 340, maxWidth: 420 }}>
            <BillableItemPicker onSelect={handleAddBillable} disabled={!!editingId} />
          </div>
        )}
      </div>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={items ?? []}
        loading={isLoading}
        pagination={false}
        size='small'
        summary={() =>
          (items?.length ?? 0) > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align='right'>
                <strong>UKUPNO:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align='right'>
                <strong>{grandTotal.toFixed(2)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
            </Table.Summary.Row>
          ) : null
        }
      />
    </Form>
  );
}
