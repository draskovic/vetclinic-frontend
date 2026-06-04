import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  message,
  Radio,
  Result,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Modal,
} from 'antd';
import {
  CheckCircleTwoTone,
  DeleteOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';
import { inventoryItemsApi, ownersApi, quickSaleApi, invoicesApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import BillableItemPicker from '@/components/BillableItemPicker';
import type {
  BillableItem,
  Owner,
  PaymentMethod,
  QuickSaleLineRequest,
  QuickSaleRequest,
  QuickSaleResponse,
} from '@/types';
import { INVENTORY_FULL_KEYS, INVOICE_KEYS } from '@/lib/queryKeySets';

const { Title, Text } = Typography;

type CustomerMode = 'owner' | 'walkin';

interface LocalLine {
  key: string;
  serviceId?: string | null;
  inventoryItemId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
  discountPercent: number;
  catalogUnitPrice: number | null; // cena iz šifarnika pri dodavanju — za detekciju izmene
  // Lokalni preview totala (server je single source of truth — ovo je samo UI prikaz)
  lineNet: number;
  lineTax: number;
  lineTotal: number;
}

function computeLine(line: Omit<LocalLine, 'key' | 'lineNet' | 'lineTax' | 'lineTotal'>): {
  lineNet: number;
  lineTax: number;
  lineTotal: number;
} {
  const base = line.unitPrice * line.quantity;
  const discount = (base * line.discountPercent) / 100;
  const net = base - discount;
  const tax = (net * line.taxRatePercent) / 100;
  return {
    lineNet: round2(net),
    lineTax: round2(tax),
    lineTotal: round2(net + tax),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function genKey() {
  return Math.random().toString(36).slice(2, 11);
}

export default function QuickSalePage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // ===================== Customer =====================
  const [customerMode, setCustomerMode] = useState<CustomerMode>('walkin');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState<string>('');

  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 300);
  const { data: ownersData } = useQuery({
    queryKey: ['quick-sale-owners', debouncedOwnerSearch],
    queryFn: () => ownersApi.getAll(0, 50, debouncedOwnerSearch),
    enabled: customerMode === 'owner',
  });
  const owners: Owner[] = ownersData?.data?.content ?? [];

  // ===================== Lines =====================
  const [lines, setLines] = useState<LocalLine[]>([]);

  const addBillable = (it: BillableItem) => {
    const partial = {
      serviceId: it.type === 'SERVICE' ? it.id : null,
      inventoryItemId: it.type === 'ITEM' ? it.id : null,
      name: it.name,
      quantity: 1,
      unitPrice: Number(it.unitPrice ?? 0),
      taxRatePercent: Number(it.taxRatePercent ?? 0),
      discountPercent: 0,
      catalogUnitPrice: it.unitPrice == null ? null : Number(it.unitPrice),
    };
    setLines((prev) => [...prev, { key: genKey(), ...partial, ...computeLine(partial) }]);
  };

  const updateLine = (key: string, patch: Partial<LocalLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        return { ...next, ...computeLine(next) };
      }),
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  // ===================== Totals (UI preview) =====================
  const subtotal = useMemo(() => round2(lines.reduce((s, l) => s + l.lineNet, 0)), [lines]);
  const taxAmount = useMemo(() => round2(lines.reduce((s, l) => s + l.lineTax, 0)), [lines]);
  const total = useMemo(() => round2(subtotal + taxAmount), [subtotal, taxAmount]);

  // ===================== Payment =====================
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');

  const paidAmount = useMemo(() => Math.min(tenderedAmount, total), [tenderedAmount, total]);
  const changeAmount = useMemo(
    () => round2(Math.max(tenderedAmount - total, 0)),
    [tenderedAmount, total],
  );
  const predictedStatus = useMemo<'PAID' | 'PARTIALLY_PAID' | null>(() => {
    if (lines.length > 0 && total === 0) return 'PAID';
    if (tenderedAmount <= 0) return null;
    return tenderedAmount + 0.01 >= total ? 'PAID' : 'PARTIALLY_PAID';
  }, [tenderedAmount, total, lines.length]);

  // ===================== Submit =====================
  const [lastResult, setLastResult] = useState<QuickSaleResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (req: QuickSaleRequest) => quickSaleApi.create(req),
    onSuccess: (resp) => {
      setLastResult(resp.data);
      message.success(`Prodaja uspešna — faktura ${resp.data.invoice.invoiceNumber}`);

      invalidateAndBroadcast(queryClient, [
        ['billable-items'],
        ...INVOICE_KEYS,
        ...INVENTORY_FULL_KEYS,
      ]);

      // Ponudi čuvanje izmenjene/nove cene artikla u šifarnik
      const changed = lines.filter(
        (l) => l.inventoryItemId && l.unitPrice > 0 && l.unitPrice !== l.catalogUnitPrice,
      );
      if (changed.length > 0) {
        Modal.confirm({
          title: 'Sačuvati nove cene u šifarnik?',
          content: (
            <div>
              <p>Sledeći artikli su prodati po ceni različitoj od šifarnika:</p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {changed.map((l) => (
                  <li key={l.key}>
                    {l.name}:{' '}
                    {l.catalogUnitPrice == null
                      ? 'bez cene'
                      : `${l.catalogUnitPrice.toLocaleString('sr-RS')} RSD`}{' '}
                    → <strong>{l.unitPrice.toLocaleString('sr-RS')} RSD</strong>
                  </li>
                ))}
              </ul>
            </div>
          ),
          okText: 'Sačuvaj cene',
          cancelText: 'Ne, samo ova prodaja',
          onOk: async () => {
            try {
              await Promise.all(
                changed.map((l) =>
                  inventoryItemsApi.update(l.inventoryItemId!, { sellPrice: l.unitPrice }),
                ),
              );
              message.success('Cene artikala ažurirane u šifarniku.');
              invalidateAndBroadcast(queryClient, [['billable-items'], ...INVENTORY_FULL_KEYS]);
            } catch {
              message.error('Greška pri čuvanju cena.');
            }
          },
        });
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Greška pri kreiranju prodaje.';
      message.error(msg);
    },
  });

  const canSubmit = lines.length > 0 && (tenderedAmount > 0 || total === 0) && !mutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const zeroPrice = lines.find((l) => l.unitPrice <= 0);
    if (zeroPrice) {
      message.warning(
        `Stavka "${zeroPrice.name}" ima cenu 0. Unesite redovnu cenu; za besplatnu stavku stavite popust 100%.`,
      );
      return;
    }

    const payload: QuickSaleRequest = {
      ownerId: customerMode === 'owner' ? ownerId : null,
      walkInCustomerName: customerMode === 'walkin' && walkInName.trim() ? walkInName.trim() : null,
      locationId: null,
      vetId: currentUser?.id ?? null,
      issuedAt: null,
      currency: 'RSD',
      note: null,
      lines: lines.map<QuickSaleLineRequest>((l) => ({
        serviceId: l.serviceId ?? null,
        inventoryItemId: l.inventoryItemId ?? null,
        description: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRateId: null,
        discountPercent: l.discountPercent,
      })),
      paymentMethod,
      tenderedAmount,
      paidAt: null,
      paymentReferenceNumber: paymentReferenceNumber.trim() || null,
      paymentNote: null,
    };

    mutation.mutate(payload);
  };

  const handleNewSale = () => {
    setLastResult(null);
    setLines([]);
    setTenderedAmount(0);
    setWalkInName('');
    setOwnerId(null);
    setPaymentReferenceNumber('');
    setCustomerMode('walkin');
    setPaymentMethod('CASH');
  };

  const handlePrintReceipt = async () => {
    if (!lastResult) return;
    try {
      const response = await invoicesApi.downloadPdf(lastResult.invoice.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `racun-${lastResult.invoice.invoiceNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Greška pri preuzimanju PDF-a');
    }
  };

  // ===================== Render — Success result =====================
  if (lastResult) {
    return (
      <Result
        icon={<CheckCircleTwoTone twoToneColor='#52c41a' />}
        status='success'
        title={`Prodaja završena — ${lastResult.invoice.invoiceNumber}`}
        subTitle={
          <Space direction='vertical' size={4}>
            <Text>
              Ukupno: {lastResult.invoice.total.toLocaleString('sr-RS')}{' '}
              {lastResult.invoice.currency}
            </Text>
            <Text>
              Plaćeno: {lastResult.payment.amount.toLocaleString('sr-RS')}{' '}
              {lastResult.invoice.currency}
            </Text>
            {lastResult.changeAmount > 0 && (
              <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                Vrati klijentu: {lastResult.changeAmount.toLocaleString('sr-RS')}{' '}
                {lastResult.invoice.currency}
              </Text>
            )}
            <Tag color={lastResult.invoice.status === 'PAID' ? 'green' : 'orange'}>
              {lastResult.invoice.status}
            </Tag>
          </Space>
        }
        extra={[
          <Button key='print' icon={<PrinterOutlined />} size='large' onClick={handlePrintReceipt}>
            Štampaj račun
          </Button>,
          <Button type='primary' key='new' size='large' onClick={handleNewSale}>
            Nova prodaja
          </Button>,
        ]}
      />
    );
  }

  // ===================== Render — POS =====================
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <ShoppingCartOutlined /> Brza prodaja (POS)
      </Title>

      <Row gutter={16}>
        {/* LEVO — kupac + stavke */}
        <Col xs={24} lg={16}>
          <Card title='Kupac' size='small' style={{ marginBottom: 16 }}>
            <Radio.Group
              value={customerMode}
              onChange={(e) => setCustomerMode(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <Radio value='walkin'>Anonimni kupac</Radio>
              <Radio value='owner'>Postojeći vlasnik</Radio>
            </Radio.Group>

            {customerMode === 'walkin' ? (
              <Input
                placeholder='Ime kupca (opciono)'
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                allowClear
              />
            ) : (
              <Select
                showSearch
                placeholder='Pretraži vlasnika...'
                value={ownerId}
                onChange={setOwnerId}
                onSearch={setOwnerSearch}
                filterOption={false}
                style={{ width: '100%' }}
                allowClear
                onInputKeyDown={(e) => {
                  if (e.key === ' ') e.stopPropagation();
                }}
                options={owners.map((o) => ({
                  value: o.id,
                  label: `${o.firstName} ${o.lastName}${o.phone ? ' — ' + o.phone : ''}`,
                }))}
              />
            )}
          </Card>

          <Card
            title={`Stavke (${lines.length})`}
            size='small'
            extra={
              <div style={{ width: 300 }}>
                <BillableItemPicker onSelect={addBillable} placeholder='+ Usluga ili artikal' />
              </div>
            }
          >
            {lines.length === 0 ? (
              <Empty description='Dodaj uslugu ili artikal' image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                rowKey='key'
                dataSource={lines}
                pagination={false}
                size='small'
                columns={[
                  { title: 'Naziv', dataIndex: 'name', key: 'name' },
                  {
                    title: 'Kol.',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 90,
                    render: (_, l) => (
                      <InputNumber
                        min={0.01}
                        step={1}
                        value={l.quantity}
                        onChange={(v) => updateLine(l.key, { quantity: Number(v) || 1 })}
                        style={{ width: '100%' }}
                      />
                    ),
                  },
                  {
                    title: 'Cena',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    width: 110,
                    render: (_, l) => (
                      <InputNumber
                        min={0}
                        value={l.unitPrice}
                        status={l.unitPrice <= 0 ? 'error' : undefined}
                        onChange={(v) => updateLine(l.key, { unitPrice: Number(v) || 0 })}
                        style={{ width: '100%' }}
                      />
                    ),
                  },
                  {
                    title: 'Pop. %',
                    dataIndex: 'discountPercent',
                    key: 'discountPercent',
                    width: 80,
                    render: (_, l) => (
                      <InputNumber
                        min={0}
                        max={100}
                        value={l.discountPercent}
                        onChange={(v) => updateLine(l.key, { discountPercent: Number(v) || 0 })}
                        style={{ width: '100%' }}
                      />
                    ),
                  },
                  {
                    title: 'PDV',
                    dataIndex: 'taxRatePercent',
                    key: 'taxRatePercent',
                    width: 70,
                    render: (v: number) => `${v}%`,
                  },
                  {
                    title: 'Ukupno',
                    dataIndex: 'lineTotal',
                    key: 'lineTotal',
                    width: 110,
                    align: 'right',
                    render: (v: number) => v.toLocaleString('sr-RS'),
                  },
                  {
                    key: 'actions',
                    width: 40,
                    render: (_, l) => (
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeLine(l.key)}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>

        {/* DESNO — summary + payment */}
        <Col xs={24} lg={8}>
          <Card title='Ukupno' size='small' style={{ marginBottom: 16 }}>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Row justify='space-between'>
                <Text>Osnovica:</Text>
                <Text>{subtotal.toLocaleString('sr-RS')} RSD</Text>
              </Row>
              <Row justify='space-between'>
                <Text>PDV:</Text>
                <Text>{taxAmount.toLocaleString('sr-RS')} RSD</Text>
              </Row>
              <Row justify='space-between'>
                <Title level={4} style={{ margin: 0 }}>
                  Total:
                </Title>
                <Title level={4} style={{ margin: 0 }}>
                  {total.toLocaleString('sr-RS')} RSD
                </Title>
              </Row>
            </Space>
          </Card>

          <Card title='Plaćanje' size='small'>
            <Space direction='vertical' style={{ width: '100%' }} size={12}>
              <div>
                <Text type='secondary'>Način plaćanja</Text>
                <Select
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'CASH', label: 'Gotovina' },
                    { value: 'CARD', label: 'Kartica' },
                    { value: 'TRANSFER', label: 'Transfer' },
                    { value: 'OTHER', label: 'Ostalo' },
                  ]}
                />
              </div>

              <div>
                <Text type='secondary'>Primljeno (RSD)</Text>
                <InputNumber
                  min={0}
                  value={tenderedAmount}
                  onChange={(v) => setTenderedAmount(Number(v) || 0)}
                  style={{ width: '100%' }}
                  step={100}
                  autoFocus
                />
              </div>

              {(paymentMethod === 'CARD' || paymentMethod === 'TRANSFER') && (
                <div>
                  <Text type='secondary'>Referenca (slip/broj transakcije)</Text>
                  <Input
                    value={paymentReferenceNumber}
                    onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                  />
                </div>
              )}

              {predictedStatus && (
                <Row gutter={8}>
                  <Col span={12}>
                    <Statistic title='Plaćeno' value={paidAmount} precision={2} suffix='RSD' />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title='Kusur'
                      value={changeAmount}
                      precision={2}
                      suffix='RSD'
                      valueStyle={{ color: changeAmount > 0 ? '#52c41a' : undefined }}
                    />
                  </Col>
                </Row>
              )}

              {predictedStatus && (
                <Tag
                  color={predictedStatus === 'PAID' ? 'green' : 'orange'}
                  style={{ width: '100%', textAlign: 'center', padding: 6, fontSize: 14 }}
                >
                  {predictedStatus === 'PAID' ? 'PLAĆENO U POTPUNOSTI' : 'DELIMIČNO PLAĆENO'}
                </Tag>
              )}

              <Button
                type='primary'
                size='large'
                block
                icon={<PlusOutlined />}
                disabled={!canSubmit}
                loading={mutation.isPending}
                onClick={handleSubmit}
              >
                Potvrdi prodaju
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
