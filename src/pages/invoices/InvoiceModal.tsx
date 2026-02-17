import { useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Input,
  InputNumber,
  DatePicker,
  Row,
  Col,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices';
import { ownersApi } from '@/api/owners';
import { clinicLocationsApi } from '@/api/clinic-locations';
import type { Invoice, CreateInvoiceRequest, UpdateInvoiceRequest } from '@/types';
import InvoiceItemsTable from './InvoiceItemsTable';
import dayjs from 'dayjs';

interface InvoiceModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

const statusOptions = [
  { label: 'Nacrt', value: 'DRAFT' },
  { label: 'Izdata', value: 'ISSUED' },
  { label: 'Plaćena', value: 'PAID' },
  { label: 'Delimično plaćena', value: 'PARTIALLY_PAID' },
  { label: 'Dospela', value: 'OVERDUE' },
  { label: 'Stornirana', value: 'CANCELLED' },
  { label: 'Refundirana', value: 'REFUNDED' },
];

const currencyOptions = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
];

export default function InvoiceModal({ open, invoice, onClose }: InvoiceModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!invoice;

  const { data: ownersData } = useQuery({
    queryKey: ['owners-all'],
    queryFn: () => ownersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['clinic-locations-active'],
    queryFn: () => clinicLocationsApi.getActive().then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (invoice) {
        form.setFieldsValue({
          ...invoice,
          issuedAt: invoice.issuedAt ? dayjs(invoice.issuedAt) : null,
          dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, invoice, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceRequest) => invoicesApi.create(data),
    onSuccess: () => {
      message.success('Faktura je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInvoiceRequest) => invoicesApi.update(invoice!.id, data),
    onSuccess: () => {
      message.success('Faktura je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubtotalChange = () => {
    const subtotal = form.getFieldValue('subtotal') ?? 0;
    const taxAmount = form.getFieldValue('taxAmount') ?? 0;
    const discountAmount = form.getFieldValue('discountAmount') ?? 0;
    form.setFieldValue('total', subtotal + taxAmount - discountAmount);
  };

  const handleSubmit = (
    values: CreateInvoiceRequest & { issuedAt?: dayjs.Dayjs; dueDate?: dayjs.Dayjs },
  ) => {
    const payload = {
      ...values,
      issuedAt: values.issuedAt ? values.issuedAt.toISOString() : undefined,
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
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

  const locationOptions =
    locationsData?.map((l) => ({
      label: l.name,
      value: l.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni fakturu' : 'Nova faktura'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={900}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
        initialValues={{
          status: 'DRAFT',
          currency: 'RSD',
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          total: 0,
        }}
      >
        <Row gutter={16}>
          <Col span={6}>
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
          <Col span={6}>
            <Form.Item name='status' label='Status'>
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='issuedAt' label='Datum izdavanja'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='dueDate' label='Rok plaćanja'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={5}>
            <Form.Item name='subtotal' label='Iznos bez PDV-a'>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                onChange={handleSubtotalChange}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='taxAmount' label='Porez'>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                onChange={handleSubtotalChange}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='discountAmount' label='Popust'>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                onChange={handleSubtotalChange}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='total' label='Ukupno'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} disabled />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='currency' label='Valuta'>
              <Select options={currencyOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name='locationId' label='Lokacija'>
              <Select
                placeholder='Izaberite lokaciju...'
                options={locationOptions}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='note' label='Napomena'>
              <Input.TextArea placeholder='Napomena...' rows={1} />
            </Form.Item>
          </Col>
        </Row>

        {isEditing && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <InvoiceItemsTable
              invoiceId={invoice!.id}
              onItemsChanged={(items) => {
                const subtotal = items.reduce((sum, item) => {
                  const base = (item.quantity ?? 0) * (item.unitPrice ?? 0);
                  const discount = base * ((item.discountPercent ?? 0) / 100);
                  return sum + (base - discount);
                }, 0);
                const taxAmount = items.reduce((sum, item) => {
                  const base = (item.quantity ?? 0) * (item.unitPrice ?? 0);
                  const discount = base * ((item.discountPercent ?? 0) / 100);
                  const net = base - discount;
                  return sum + net * ((item.taxRate ?? 0) / 100);
                }, 0);
                const discountAmount = items.reduce((sum, item) => {
                  const base = (item.quantity ?? 0) * (item.unitPrice ?? 0);
                  return sum + base * ((item.discountPercent ?? 0) / 100);
                }, 0);
                form.setFieldsValue({
                  subtotal: +subtotal.toFixed(2),
                  taxAmount: +taxAmount.toFixed(2),
                  discountAmount: +discountAmount.toFixed(2),
                  total: +(subtotal + taxAmount).toFixed(2),
                });
              }}
            />
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj fakturu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
