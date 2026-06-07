import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Popconfirm,
  message,
  Select,
  Typography,
  Tooltip,
  Tag,
  Form,
  InputNumber,
  Space,
} from 'antd';
import {
  DeleteOutlined,
  WarningOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { servicesApi, treatmentsApi, inventoryItemsApi, serviceInventoryItemsApi } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Treatment } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';
import { INVENTORY_FULL_KEYS, INVOICE_KEYS } from '@/lib/queryKeySets';

interface TreatmentItemsTableProps {
  medicalRecordId: string | null; // null = nova intervencija, još nije kreirana
  vetId: string; // preuzima veterinara iz forme
}

export default function TreatmentItemsTable({ medicalRecordId, vetId }: TreatmentItemsTableProps) {
  const [form] = Form.useForm();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [serviceSearch, setServiceSearch] = useState('');
  const debouncedServiceSearch = useDebouncedValue(serviceSearch, 300);

  const { data: servicesData } = useQuery({
    queryKey: ['services-search', debouncedServiceSearch],
    queryFn: () => servicesApi.getAll(0, 20, debouncedServiceSearch || undefined),
  });

  const { data: treatmentsData, refetch } = useQuery({
    queryKey: ['treatments', medicalRecordId],
    queryFn: () => treatmentsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  useEffect(() => {
    if (treatmentsData) {
      setTreatments(treatmentsData.data);
    }
  }, [treatmentsData]);

  // Low-stock artikli za upozorenja
  const { data: lowStockData } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: () => inventoryItemsApi.getLowStock().then((r) => r.data),
  });

  const lowStockProductIds = useMemo(
    () => new Set(lowStockData?.map((i) => i.productId) ?? []),
    [lowStockData],
  );

  // Mapiranja usluga → inventar artikli (za tooltip upozorenja)
  const { data: allMappings } = useQuery({
    queryKey: ['service-inventory-mappings', medicalRecordId],
    queryFn: async () => {
      const sids = [...new Set(treatments.map((t) => t.serviceId).filter(Boolean) as string[])];
      const map: Record<string, Array<{ name: string; isLow: boolean }>> = {};
      for (const sid of sids) {
        const res = await serviceInventoryItemsApi.getByService(sid);
        map[sid] = (res.data ?? []).map((item) => ({
          name: item.productName,
          isLow: lowStockProductIds.has(item.productId),
        }));
      }
      return map;
    },
    enabled: treatments.length > 0 && lowStockData !== undefined,
  });

  const serviceOptions = useMemo(
    () =>
      servicesData?.content.map((s) => ({
        label: `${s.sku ? s.sku + ' — ' : ''}${s.name}`,
        value: s.id,
      })) ?? [],
    [servicesData],
  );

  const createMutation = useMutation({
    mutationFn: (serviceId: string) =>
      treatmentsApi.create({
        medicalRecordId: medicalRecordId!,
        vetId: vetId,
        name: serviceOptions.find((s) => s.value === serviceId)?.label ?? '',
        serviceId: serviceId,
      }),
    onSuccess: () => {
      message.success('Usluga dodata!');
      refetch();
      invalidateAndBroadcast(queryClient, [
        ['service-inventory-mappings'],
        ...INVOICE_KEYS,
        ...INVENTORY_FULL_KEYS,
      ]);
    },
    onError: () => message.error('Greška pri dodavanju usluge!'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { quantity: number; unitPrice: number | null; discountPercent: number };
    }) => treatmentsApi.update(id, data),
    onSuccess: () => {
      message.success('Stavka izmenjena!');
      setEditingId(null);
      form.resetFields();
      refetch();
      // izmena qty/cene/popusta sinhronizuje fakturnu stavku (korak 4), ne dira lager (BOM po usluzi)
      invalidateAndBroadcast(queryClient, [...INVOICE_KEYS]);
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentsApi.delete(id),
    onSuccess: () => {
      message.success('Usluga uklonjena!');
      refetch();
      invalidateAndBroadcast(queryClient, [
        ['service-inventory-mappings'],
        ...INVOICE_KEYS,
        ...INVENTORY_FULL_KEYS,
      ]);
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const startEditing = (record: Treatment) => {
    setEditingId(record.id);
    form.setFieldsValue({
      quantity: record.quantity ?? 1,
      unitPrice: record.unitPrice,
      discountPercent: record.discountPercent ?? 0,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    form.resetFields();
  };

  const handleSave = (id: string) => {
    form.validateFields().then((values) => {
      updateMutation.mutate({
        id,
        data: {
          quantity: values.quantity ?? 1,
          unitPrice: values.unitPrice ?? null, // prazno = vrati na katalošku cenu
          discountPercent: values.discountPercent ?? 0,
        },
      });
    });
  };

  const lineAmount = (t: Treatment): number | null =>
    t.unitPrice == null ? null : t.quantity * t.unitPrice * (1 - (t.discountPercent ?? 0) / 100);

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre dodavanja usluga.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Form form={form} component={false}>
        <Table
          dataSource={treatments}
          rowKey='id'
          pagination={false}
          size='small'
          columns={[
            {
              title: 'Usluga',
              dataIndex: 'name',
              key: 'name',
              render: (name: string, record: Treatment) => {
                const mapping = allMappings?.[record.serviceId ?? ''];
                const hasLow = mapping?.some((m) => m.isLow);
                return (
                  <span>
                    {name}
                    {hasLow && (
                      <Tooltip
                        title={
                          <>
                            Nizak nivo zaliha:
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              {mapping
                                ?.filter((m) => m.isLow)
                                .map((m) => (
                                  <li key={m.name}>{m.name}</li>
                                ))}
                            </ul>
                          </>
                        }
                      >
                        <Tag color='orange' style={{ marginLeft: 8 }}>
                          <WarningOutlined /> Nizak lager
                        </Tag>
                      </Tooltip>
                    )}
                  </span>
                );
              },
            },
            {
              title: 'Količina',
              key: 'quantity',
              width: 100,
              align: 'right',
              render: (_: unknown, record: Treatment) =>
                editingId === record.id ? (
                  <Form.Item
                    name='quantity'
                    style={{ margin: 0 }}
                    rules={[{ required: true, message: '' }]}
                  >
                    <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
                  </Form.Item>
                ) : (
                  record.quantity
                ),
            },
            {
              title: 'Jed. cena',
              key: 'unitPrice',
              width: 130,
              align: 'right',
              render: (_: unknown, record: Treatment) =>
                editingId === record.id ? (
                  <Form.Item name='unitPrice' style={{ margin: 0 }}>
                    <InputNumber
                      min={0}
                      step={0.01}
                      precision={2}
                      style={{ width: '100%' }}
                      placeholder='katalog'
                    />
                  </Form.Item>
                ) : record.unitPrice == null ? (
                  <Typography.Text type='secondary'>—</Typography.Text>
                ) : (
                  record.unitPrice.toFixed(2)
                ),
            },
            {
              title: 'Popust %',
              key: 'discountPercent',
              width: 100,
              align: 'right',
              render: (_: unknown, record: Treatment) =>
                editingId === record.id ? (
                  <Form.Item name='discountPercent' style={{ margin: 0 }}>
                    <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
                  </Form.Item>
                ) : (
                  `${record.discountPercent ?? 0}%`
                ),
            },
            {
              title: 'Iznos',
              key: 'amount',
              width: 120,
              align: 'right',
              render: (_: unknown, record: Treatment) => {
                const amt = lineAmount(record);
                return amt == null ? (
                  <Typography.Text type='secondary'>—</Typography.Text>
                ) : (
                  <strong>{amt.toFixed(2)}</strong>
                );
              },
            },
            {
              title: '',
              key: 'actions',
              width: 90,
              render: (_: unknown, record: Treatment) =>
                editingId === record.id ? (
                  <Space>
                    <Button
                      icon={<SaveOutlined />}
                      size='small'
                      type='primary'
                      onClick={() => handleSave(record.id)}
                      loading={updateMutation.isPending}
                    />
                    <Button icon={<CloseOutlined />} size='small' onClick={handleCancel} />
                  </Space>
                ) : (
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      size='small'
                      onClick={() => startEditing(record)}
                      disabled={!!editingId}
                    />
                    <Popconfirm
                      title='Ukloniti uslugu?'
                      onConfirm={() => deleteMutation.mutate(record.id)}
                      disabled={!!editingId}
                    >
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        size='small'
                        disabled={!!editingId}
                      />
                    </Popconfirm>
                  </Space>
                ),
            },
          ]}
          title={() => (
            <Select
              placeholder='Dodaj uslugu...'
              options={serviceOptions}
              showSearch
              style={{ width: '100%' }}
              value={null}
              onChange={(serviceId) => {
                if (serviceId) {
                  createMutation.mutate(serviceId);
                  setServiceSearch('');
                }
              }}
              filterOption={false}
              onSearch={(value) => setServiceSearch(value)}
              onInputKeyDown={(e) => {
                if (e.key === ' ') e.stopPropagation();
              }}
              loading={createMutation.isPending}
              disabled={!!editingId}
            />
          )}
        />
      </Form>
    </div>
  );
}
