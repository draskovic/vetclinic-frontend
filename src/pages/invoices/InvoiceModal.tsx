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
import type {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceFromMedicalRecordRequest,
} from '@/types';
import InvoiceItemsTable from './InvoiceItemsTable';
import dayjs from 'dayjs';
import PaymentItemsTable from './PaymentItemsTable';
import { paymentsApi } from '@/api/payments';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { FilePdfOutlined } from '@ant-design/icons';

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

  const currentInvoice = createdInvoice ?? invoice;

  const selectedOwnerId = Form.useWatch('ownerId', form);

  const isEditing = !!currentInvoice;

  const itemsLocked = ['PAID', 'CANCELLED', 'REFUNDED'].includes(currentInvoice?.status ?? '');

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
      // KRITIČNO: reset uvek (i pri editu i pri novom), inače createdInvoice
      // iz prethodne session-e modala pregazi novi invoice prop preko
      // currentInvoice = createdInvoice ?? invoice.
      setCreatedInvoice(null);
      setPaidImmediately(false);

      if (invoice) {
        form.setFieldsValue({
          ...invoice,
          issuedAt: invoice.issuedAt ? dayjs(invoice.issuedAt) : null,
          dueDate: invoice.dueDate ? dayjs(invoice.dueDate) : null,
        });
      } else {
        form.resetFields();
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

  // Standardna kreacija — koristi se kad NEMA medicalRecordId u defaultValues
  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceRequest) => invoicesApi.create(data),
    onSuccess: (response) => {
      message.success('Faktura je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreatedInvoice(response.data);
    },
    onError: () => message.error('Greška pri kreiranju!'),
  });

  // Atomska kreacija iz medical record-a — kreira invoice + sve stavke u 1 API pozivu
  const createFromRecordMutation = useMutation({
    mutationFn: (data: CreateInvoiceFromMedicalRecordRequest) =>
      invoicesApi.createFromMedicalRecord(defaultValues!.medicalRecordId!, data),
    onSuccess: (response) => {
      const { invoice, items } = response.data;
      message.success('Faktura je kreirana!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-by-record'] });
      // Pre-popuni cache stavkama → InvoiceItemsTable se montira sa već popunjenim podacima, bez GET-a
      queryClient.setQueryData(['invoice-items', invoice.id], items);
      setCreatedInvoice(invoice);
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 409) {
        message.warning('Za ovu intervenciju već postoji faktura!');
      } else {
        message.error('Greška pri kreiranju!');
      }
    },
  });

  // Auto-kreiranje stavki PO mountovanju InvoiceItemsTable (kad createdInvoice postane non-null)

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
      ...(isEditing && currentInvoice?.version != null ? { version: currentInvoice.version } : {}),
    };

    if (isEditing) {
      let payloadVersion = currentInvoice?.version;

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
            setPaidImmediately(false);
            queryClient.invalidateQueries({ queryKey: ['payments', currentInvoice!.id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-by-record'] });

            // Plaćanje je promenilo version fakture na backend-u (status PAID + ++version).
            // Refetch da bismo izbegli optimistic-lock konflikt pri update-u.
            try {
              const refreshed = await invoicesApi.getById(currentInvoice!.id);
              payloadVersion = refreshed.data.version;
            } catch {
              // ignore — fallback na stari version, backend će vratiti 409 ako se desio konflikt
            }
          }
        } catch (e) {
          message.warning('Plaćanje nije evidentirano. Dodajte ručno u tab Plaćanja.');
        }
      }

      // Recompute payload sa svežim version-om
      const finalPayload = {
        ...payload,
        ...(payloadVersion != null ? { version: payloadVersion } : {}),
      };

      updateMutation.mutate(finalPayload);
    } else {
      // Bira mutaciju u zavisnosti od konteksta
      if (defaultValues?.medicalRecordId) {
        createFromRecordMutation.mutate({
          locationId: payload.locationId,
          issuedAt: payload.issuedAt,
          dueDate: payload.dueDate,
          currency: payload.currency,
          note: payload.note,
        });
      } else {
        createMutation.mutate(payload);
      }
    }
  };

  const isLoading =
    createMutation.isPending || createFromRecordMutation.isPending || updateMutation.isPending;

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
                    readOnly={itemsLocked}
                    onItemsChanged={async () => {
                      try {
                        const res = await invoicesApi.getById(currentInvoice!.id);
                        const inv = res.data;
                        form.setFieldsValue({
                          subtotal: inv.subtotal,
                          taxAmount: inv.taxAmount,
                          discountAmount: inv.discountAmount,
                          total: inv.total,
                        });
                        // Ažuriraj createdInvoice da svež version dođe u sledeći update payload
                        setCreatedInvoice(inv);
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
                        // Ažuriraj createdInvoice da svež version dođe u sledeći update payload
                        setCreatedInvoice(inv);
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
          {isEditing && (
            <Button
              icon={<FilePdfOutlined />}
              style={{ marginRight: 8 }}
              onClick={async () => {
                try {
                  const response = await invoicesApi.downloadPdf(currentInvoice!.id);
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch {
                  message.error('Greška pri generisanju PDF-a!');
                }
              }}
            >
              Štampaj
            </Button>
          )}
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj fakturu'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
