import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  InputNumber,
  Select,
  Form,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceItemsApi } from '@/api/invoices';
import { servicesApi } from '@/api';
import type { InvoiceItem, CreateInvoiceItemRequest, UpdateInvoiceItemRequest } from '@/types';
import type { ColumnsType } from 'antd/es/table';

interface Props {
  invoiceId: string;
  onItemsChanged?: (items: InvoiceItem[]) => void;
}

export default function InvoiceItemsTable({ invoiceId, onItemsChanged }: Props) {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: () => invoiceItemsApi.getByInvoice(invoiceId).then((r) => r.data),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-all'],
    queryFn: () => servicesApi.getAll(0, 100),
  });

  const serviceOptions =
    servicesData?.content
      ?.filter((s) => s.active)
      .map((s) => ({
        label: `${s.name} — ${s.price.toFixed(2)} RSD`,
        value: s.id,
      })) ?? [];

  useEffect(() => {
    if (items && onItemsChanged) {
      onItemsChanged(items);
    }
  }, [items]);

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceItemRequest) => invoiceItemsApi.create(data),
    onSuccess: () => {
      message.success('Stavka dodata');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
      setAdding(false);
      form.resetFields();
    },
    onError: () => message.error('Greška pri dodavanju stavke'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceItemRequest }) =>
      invoiceItemsApi.update(id, data),
    onSuccess: () => {
      message.success('Stavka izmenjena');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
      setEditingId(null);
    },
    onError: () => message.error('Greška pri izmeni stavke'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceItemsApi.delete(id),
    onSuccess: () => {
      message.success('Stavka obrisana');
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
    },
  });

  const calculateLineTotal = () => {
    const quantity = form.getFieldValue('quantity') ?? 1;
    const unitPrice = form.getFieldValue('unitPrice') ?? 0;
    const taxRate = form.getFieldValue('taxRate') ?? 20;
    const discountPercent = form.getFieldValue('discountPercent') ?? 0;
    const base = quantity * unitPrice;
    const discount = base * (discountPercent / 100);
    const subtotal = base - discount;
    const tax = subtotal * (taxRate / 100);
    const lineTotal = +(subtotal + tax).toFixed(2);
    form.setFieldValue('lineTotal', lineTotal);
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = servicesData?.content?.find((s) => s.id === serviceId);
    if (service) {
      form.setFieldsValue({
        description: service.name,
        unitPrice: service.price,
        taxRate: service.taxRate,
      });
      calculateLineTotal();
    }
  };

  const startEditing = (record: InvoiceItem) => {
    setEditingId(record.id);
    setAdding(false);
    form.setFieldsValue({
      serviceId: record.serviceId,
      description: record.description,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      taxRate: record.taxRate,
      discountPercent: record.discountPercent,
      lineTotal: record.lineTotal,
    });
  };

  const startAdding = () => {
    setAdding(true);
    setEditingId(null);
    form.setFieldsValue({
      serviceId: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 20,
      discountPercent: 0,
      lineTotal: 0,
    });
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editingId) {
        updateMutation.mutate({
          id: editingId,
          data: {
            ...values,
            serviceId: values.serviceId ?? null,
          },
        });
      } else {
        createMutation.mutate({
          ...values,
          invoiceId,
          serviceId: values.serviceId ?? null,
          sortOrder: (items?.length ?? 0) + 1,
        });
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setAdding(false);
    form.resetFields();
  };

  const isRowEditing = (record: InvoiceItem) =>
    record.id === editingId || (adding && record.id === 'new');

  const columns: ColumnsType<InvoiceItem> = [
    {
      title: 'Usluga',
      dataIndex: 'description',
      render: (val: string, record) =>
        isRowEditing(record) ? (
          <Form.Item
            name='serviceId'
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Izaberite uslugu' }]}
          >
            <Select
              placeholder='Izaberite uslugu...'
              options={serviceOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleServiceSelect}
              style={{ minWidth: 250 }}
            />
          </Form.Item>
        ) : (
          val
        ),
    },
    {
      title: 'Količina',
      dataIndex: 'quantity',
      width: 100,
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
      title: 'Jed. cena',
      dataIndex: 'unitPrice',
      width: 120,
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
      title: 'PDV %',
      dataIndex: 'taxRate',
      width: 90,
      align: 'right',
      render: (val: number, record) =>
        isRowEditing(record) ? (
          <Form.Item name='taxRate' style={{ margin: 0 }}>
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
      title: 'Popust %',
      dataIndex: 'discountPercent',
      width: 100,
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
      render: (_: unknown, record) =>
        isRowEditing(record) ? (
          <Space>
            <Button icon={<SaveOutlined />} size='small' type='primary' onClick={handleSave} />
            <Button icon={<CloseOutlined />} size='small' onClick={handleCancel} />
          </Space>
        ) : (
          <Space>
            <Button
              icon={<EditOutlined />}
              size='small'
              onClick={() => startEditing(record)}
              disabled={adding || !!editingId}
            />
            <Popconfirm title='Obrisati stavku?' onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button
                icon={<DeleteOutlined />}
                size='small'
                danger
                disabled={adding || !!editingId}
              />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  // Hidden form field za description (popunjava se automatski iz usluge)
  const grandTotal = items?.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0) ?? 0;

  return (
    <Form form={form}>
      <Form.Item name='description' hidden>
        <input type='hidden' />
      </Form.Item>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>Stavke fakture</Typography.Text>
        <Button
          size='small'
          icon={<PlusOutlined />}
          onClick={startAdding}
          disabled={adding || !!editingId}
        >
          Dodaj stavku
        </Button>
      </div>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={[
          ...(adding
            ? [
                {
                  id: 'new',
                  invoiceId,
                  serviceId: null,
                  serviceName: null,
                  description: '',
                  quantity: 1,
                  unitPrice: 0,
                  taxRate: 20,
                  discountPercent: 0,
                  lineTotal: 0,
                } as InvoiceItem,
              ]
            : []),
          ...(items ?? []),
        ]}
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
