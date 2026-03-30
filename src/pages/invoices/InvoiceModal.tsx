import { useEffect, useState } from 'react';
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
  Tabs,
  Checkbox,
  Col,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices';
import { ownersApi } from '@/api/owners';
import { clinicLocationsApi } from '@/api/clinic-locations';
import type { Invoice, CreateInvoiceRequest, UpdateInvoiceRequest } from '@/types';
import InvoiceItemsTable from './InvoiceItemsTable';
import dayjs from 'dayjs';
import PaymentItemsTable from './PaymentItemsTable';
import { treatmentsApi } from '@/api/treatments';
import { servicesApi } from '@/api/services';
import { invoiceItemsApi } from '@/api/invoices';
import { paymentsApi } from '@/api/payments';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface InvoiceModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  defaultValues?: { ownerId?: string; medicalRecordId?: string };
}

const currencyOptions = [
  { label: 'RSD', value: 'RSD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
];

export default function InvoiceModal({ open, invoice, onClose, defaultValues }: InvoiceModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [paidImmediately, setPaidImmediately] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 300);
  const currentInvoice = invoice ?? createdInvoice;
  const selectedOwnerId = Form.useWatch('ownerId', form);

  const isEditing = !!currentInvoice;

  const { data: ownersData } = useQuery({
    queryKey: ['owners-search', debouncedOwnerSearch],
    queryFn: () => ownersApi.getAll(0, 20, debouncedOwnerSearch || undefined).then((r) => r.data),
  });

  const { data: selectedOwner } = useQuery({
    queryKey: ['owner', selectedOwnerId],
    queryFn: () => ownersApi.getById(selectedOwnerId!).then((r) => r.data),
    enabled: !!selectedOwnerId,
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
        setCreatedInvoice(null);
        setPaidImmediately(false);
        form.setFieldsValue({
          status: 'DRAFT',
          currency: 'RSD',
          issuedAt: dayjs(),
          dueDate: dayjs(),
        });
        if (defaultValues) {
          form.setFieldsValue(defaultValues);
        }
      }
    }
  }, [open, invoice, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceRequest) => invoicesApi.create(data),
    onSuccess: async (response) => {
      message.success('Faktura je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const newInvoice = response.data;

      // Auto-kreiranje stavki iz usluga intervencije
      if (defaultValues?.medicalRecordId) {
        try {
          const treatmentsRes = await treatmentsApi.getByMedicalRecord(
            defaultValues.medicalRecordId,
          );
          const treatments = treatmentsRes.data;

          for (let i = 0; i < treatments.length; i++) {
            const t = treatments[i];
            if (t.serviceId) {
              const service = await servicesApi.getById(t.serviceId);
              const quantity = 1;
              const unitPrice = service.price;
              const taxRate = service.taxRate ?? 20;
              const lineTotal = quantity * unitPrice * (1 + taxRate / 100);

              await invoiceItemsApi.create({
                invoiceId: newInvoice.id,
                serviceId: t.serviceId,
                description: t.name,
                quantity,
                unitPrice,
                taxRate,
                discountPercent: 0,
                lineTotal: +lineTotal.toFixed(2),
                sortOrder: i + 1,
              });
            }
          }

          queryClient.invalidateQueries({ queryKey: ['invoice-items', newInvoice.id] });
        } catch (e) {
          message.warning('Stavke fakture nisu automatski dodate');
        }
      }

      setCreatedInvoice(newInvoice);
    },

    onError: (error: any) => {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('uq_invoice_medical_record_id')) {
        message.warning('Za ovu intervenciju već postoji faktura!');
      } else {
        message.error('Greška pri kreiranju!');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInvoiceRequest) => invoicesApi.update(currentInvoice!.id, data),
    onSuccess: () => {
      message.success('Faktura je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const handleSubmit = async (
    values: CreateInvoiceRequest & { issuedAt?: dayjs.Dayjs; dueDate?: dayjs.Dayjs },
  ) => {
    const { status: formStatus, ...rest } = values as any;
    const autoStatus = !isEditing ? (values.issuedAt ? 'ISSUED' : 'DRAFT') : formStatus;
    const manualStatuses = ['CANCELLED', 'REFUNDED', 'OVERDUE'];
    const payload = {
      ...rest,
      ...(!isEditing || manualStatuses.includes(autoStatus) ? { status: autoStatus } : {}),
      issuedAt: values.issuedAt ? values.issuedAt.toISOString() : undefined,
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      ...(!isEditing && defaultValues?.medicalRecordId
        ? { medicalRecordId: defaultValues.medicalRecordId }
        : {}),
    };

    if (isEditing) {
      if (paidImmediately) {
        const paymentMethod = form.getFieldValue('paymentMethod') || 'CASH';
        try {
          const invoiceRes = await invoicesApi.getById(currentInvoice!.id);
          const freshInvoice = invoiceRes.data;
          const existingPayments = await paymentsApi.getByInvoice(freshInvoice.id);
          const totalPaid = existingPayments.reduce(
            (sum: number, p: any) => sum + (p.amount ?? 0),
            0,
          );
          const remaining = freshInvoice.total - totalPaid;
          if (remaining > 0) {
            await paymentsApi.create({
              invoiceId: freshInvoice.id,
              amount: remaining,

              method: paymentMethod,
              paidAt: dayjs().toISOString(),
              referenceNumber: freshInvoice.invoiceNumber,
            });
            message.success('Plaćanje evidentirano!');
            // Da se ne bi ponovilo plaćanje kod sledećeg otvaranja fakture.
            setPaidImmediately(false);
            queryClient.invalidateQueries({ queryKey: ['payments', currentInvoice!.id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-by-record'] });
          }
        } catch (e) {
          message.warning('Plaćanje nije evidentirano. Dodajte ručno u tab Plaćanja.');
        }
      }
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const ownerOptions = (() => {
    const list =
      ownersData?.content.map((o) => ({
        label: `${o.clientCode ? o.clientCode + ' — ' : ''}${o.firstName} ${o.lastName}`,
        value: o.id,
      })) ?? [];
    if (selectedOwner && !list.find((o) => o.value === selectedOwner.id)) {
      list.unshift({
        label: `${selectedOwner.clientCode ? selectedOwner.clientCode + ' — ' : ''}${selectedOwner.firstName} ${selectedOwner.lastName}`,
        value: selectedOwner.id,
      });
    }
    return list;
  })();

  const locationOptions =
    locationsData?.map((l) => ({
      label: l.address ? `${l.name} - ${l.address}` : l.name,
      value: l.id,
    })) ?? [];

  return (
    <Modal
      title={currentInvoice ? `Izmeni fakturu — ${currentInvoice.invoiceNumber}` : 'Nova faktura'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={900}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        style={{ marginTop: 4 }}
        className='compact-invoice-form'
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
                filterOption={false}
                onSearch={(value) => setOwnerSearch(value)}
                onInputKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='issuedAt' label='Datum izdavanja'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='dueDate' label='Rok plaćanja'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          {isEditing && (
            <Col span={4}>
              <Form.Item label=' '>
                <Checkbox
                  checked={paidImmediately}
                  onChange={(e) => setPaidImmediately(e.target.checked)}
                  disabled={
                    !['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(currentInvoice?.status ?? '')
                  }
                >
                  Plaćeno odmah
                </Checkbox>
              </Form.Item>
            </Col>
          )}
          {isEditing && paidImmediately && (
            <Col span={4}>
              <Form.Item name='paymentMethod' label='Način plaćanja' initialValue='CASH'>
                <Select
                  options={[
                    { label: 'Gotovina', value: 'CASH' },
                    { label: 'Kartica', value: 'CARD' },
                    { label: 'Prenos', value: 'BANK_TRANSFER' },
                  ]}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={16}>
          <Col span={5}>
            <Form.Item name='subtotal' label='Iznos bez PDV-a'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} disabled />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='taxAmount' label='Porez'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} disabled />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='discountAmount' label='Popust'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} disabled />
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

        {!!currentInvoice && (
          <Tabs
            style={{ marginTop: 0, marginBottom: 0 }}
            items={[
              {
                key: 'items',
                label: 'Stavke fakture',
                children: (
                  <InvoiceItemsTable
                    invoiceId={currentInvoice!.id}
                    onItemsChanged={async () => {
                      // Backend automatski preračunava totals
                      // Refetch fakturu da dobijemo ažurirane iznose
                      try {
                        const res = await invoicesApi.getById(currentInvoice!.id);
                        const inv = res.data;
                        form.setFieldsValue({
                          subtotal: inv.subtotal,
                          taxAmount: inv.taxAmount,
                          discountAmount: inv.discountAmount,
                          total: inv.total,
                        });
                      } catch (e) {
                        // ignore
                      }
                    }}
                  />
                ),
              },
              {
                key: 'payments',
                label: 'Plaćanja',
                children: (
                  <PaymentItemsTable
                    invoiceId={currentInvoice!.id}
                    invoiceTotal={currentInvoice!.total ?? 0}
                    invoiceNumber={currentInvoice!.invoiceNumber}
                    onItemsChanged={async () => {
                      try {
                        const res = await invoicesApi.getById(currentInvoice!.id);
                        const inv = res.data;
                        form.setFieldsValue({
                          status: inv.status,
                          subtotal: inv.subtotal,
                          taxAmount: inv.taxAmount,
                          discountAmount: inv.discountAmount,
                          total: inv.total,
                        });
                      } catch (e) {
                        // ignore
                      }
                    }}
                  />
                ),
              },
            ]}
          />
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
