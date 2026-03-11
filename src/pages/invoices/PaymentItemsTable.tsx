import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payments } from '@/api';
import type { Payment, CreatePaymentRequest, UpdatePaymentRequest, PaymentMethod } from '@/types';
import dayjs from 'dayjs';

const methodLabels: Record<PaymentMethod, string> = {
  CASH: 'Gotovina',
  CARD: 'Kartica',
  TRANSFER: 'Prenos',
  OTHER: 'Ostalo',
};

const methodColors: Record<PaymentMethod, string> = {
  CASH: 'green',
  CARD: 'blue',
  TRANSFER: 'orange',
  OTHER: 'default',
};

interface PaymentItemsTableProps {
  invoiceId: string;
  invoiceTotal: number;
}

export default function PaymentItemsTable({ invoiceId, invoiceTotal }: PaymentItemsTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: paymentList = [], isLoading } = useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: () => payments.getByInvoice(invoiceId),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentRequest) => payments.create(data),
    onSuccess: () => {
      message.success('Plaćanje je zabeleženo!');
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      closeModal();
    },
    onError: () => message.error('Greška pri kreiranju plaćanja!'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePaymentRequest) => payments.update(editingPayment!.id, data),
    onSuccess: () => {
      message.success('Plaćanje je izmenjeno!');
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      closeModal();
    },
    onError: () => message.error('Greška pri izmeni plaćanja!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payments.remove(id),
    onSuccess: () => {
      message.success('Plaćanje je obrisano!');
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingPayment(null);
    form.resetFields();
  };

  const openCreate = () => {
    setEditingPayment(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment);
    form.setFieldsValue({
      ...payment,
      paidAt: dayjs(payment.paidAt),
    });
    setModalOpen(true);
  };

  const handleSubmit = (values: { paidAt: dayjs.Dayjs } & Omit<CreatePaymentRequest, 'paidAt'>) => {
    const payload = {
      ...values,
      invoiceId,
      paidAt: values.paidAt.toISOString(),
    };
    if (editingPayment) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalPaid = paymentList.reduce((sum, p) => sum + p.amount, 0);

  const columns = [
    {
      title: 'Datum',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Iznos (RSD)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => val.toLocaleString('sr-RS', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Metod',
      dataIndex: 'method',
      key: 'method',
      render: (val: PaymentMethod) => <Tag color={methodColors[val]}>{methodLabels[val]}</Tag>,
    },
    {
      title: 'Referenca',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
    },
    {
      title: 'Napomena',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Payment) => (
        <Space>
          <Button type='link' icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title='Obriši plaćanje?' onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type='link' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Space size='large'>
          <span>
            Ukupno faktura:{' '}
            <strong>
              {invoiceTotal.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </strong>
          </span>
          <span>
            Plaćeno:{' '}
            <strong>{totalPaid.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD</strong>
          </span>
          <span>
            Preostalo:{' '}
            <strong style={{ color: invoiceTotal - totalPaid <= 0 ? '#52c41a' : '#ff4d4f' }}>
              {(invoiceTotal - totalPaid).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </strong>
          </span>
        </Space>
        <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
          Dodaj plaćanje
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={paymentList}
        rowKey='id'
        loading={isLoading}
        pagination={false}
        size='small'
      />
      <Modal
        title={editingPayment ? 'Izmeni plaćanje' : 'Novo plaćanje'}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name='amount'
            label='Iznos'
            rules={[{ required: true, message: 'Unesite iznos!' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
          </Form.Item>
          <Form.Item
            name='method'
            label='Metod plaćanja'
            rules={[{ required: true, message: 'Izaberite metod!' }]}
          >
            <Select
              options={[
                { label: 'Gotovina', value: 'CASH' },
                { label: 'Kartica', value: 'CARD' },
                { label: 'Prenos', value: 'TRANSFER' },
                { label: 'Ostalo', value: 'OTHER' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name='paidAt'
            label='Datum plaćanja'
            rules={[{ required: true, message: 'Izaberite datum!' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} format='DD.MM.YYYY HH:mm' />
          </Form.Item>
          <Form.Item name='referenceNumber' label='Broj reference'>
            <Input placeholder='Broj transakcije, slip...' />
          </Form.Item>
          <Form.Item name='note' label='Napomena'>
            <Input.TextArea rows={2} placeholder='Napomena...' />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={closeModal} style={{ marginRight: 8 }}>
              Otkaži
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingPayment ? 'Sačuvaj' : 'Zabeleži plaćanje'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
