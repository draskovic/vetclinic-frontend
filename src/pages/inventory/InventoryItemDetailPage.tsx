import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  Table,
  Typography,
  Space,
  Spin,
  Popconfirm,
  message,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  inventoryItemsApi,
  inventoryTransactionsApi,
  serviceInventoryItemsApi,
  inventoryBatchesApi,
} from '@/api';
import type {
  InventoryItem,
  InventoryTransactionType,
  InventoryBatch,
  AdjustmentReason,
} from '@/types';
import InventoryItemModal from './InventoryItemModal';
import InventoryTransactionModal from './InventoryTransactionModal';
import dayjs from 'dayjs';
import InventoryBatchModal from './InventoryBatchModal';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

const categoryLabels: Record<string, string> = {
  MEDICATION: 'Lekovi',
  SUPPLY: 'Potrošni materijal',
  EQUIPMENT: 'Oprema',
};

const txTypeLabels: Record<string, { text: string; color: string }> = {
  IN: { text: 'Prijem', color: 'green' },
  OUT: { text: 'Izdavanje', color: 'red' },
  ADJUSTMENT: { text: 'Korekcija', color: 'blue' },
  EXPIRED: { text: 'Isteklo', color: 'orange' },
};

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

export default function InventoryItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);

  // Dohvati artikal
  const { data: itemData, isLoading } = useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryItemsApi.getById(id!),
    enabled: !!id,
  });
  const item: InventoryItem | undefined = itemData?.data;

  // Dohvati transakcije za artikal
  const { data: txData } = useQuery({
    queryKey: ['inventory-transactions-by-item', id],
    queryFn: () => inventoryTransactionsApi.getByItem(id!),
    enabled: !!id,
  });

  // Dohvati lotove za artikal (samo ako se prati po lotovima)
  const { data: batchesData } = useQuery({
    queryKey: ['inventory-batches', id],
    queryFn: () => inventoryBatchesApi.getByItem(id!),
    enabled: !!id && !!item?.trackBatches,
  });
  const batches: InventoryBatch[] = batchesData?.data ?? [];

  const deleteBatchMutation = useMutation({
    mutationFn: (batchId: string) => inventoryBatchesApi.delete(batchId),
    onSuccess: async () => {
      message.success('Lot obrisan');
      invalidateAndBroadcast(queryClient, [
        ['inventory-batches', id],
        ['inventory-batches'],
        ['inventory-item', id],
        ['inventory-item'],
        ['inventory-items'],
        ['inventory-batches-expiring'],
        ['dashboard-low-stock'],
      ]);
    },

    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Greška pri brisanju lota');
    },
  });

  // Dohvati povezane usluge
  const { data: linkedServicesData } = useQuery({
    queryKey: ['service-inventory-items-by-item', id],
    queryFn: () => serviceInventoryItemsApi.getByInventoryItem(id!),
    enabled: !!id,
  });

  if (isLoading) return <Spin size='large' style={{ display: 'block', margin: '100px auto' }} />;
  if (!item) return <Typography.Text>Artikal nije pronađen.</Typography.Text>;

  const isLowStock = item.reorderLevel != null && item.quantityOnHand <= item.reorderLevel;

  const infoTab = (
    <Card>
      <Descriptions column={2} bordered size='small'>
        <Descriptions.Item label='Naziv'>{item.name}</Descriptions.Item>
        <Descriptions.Item label='Šifra (SKU)'>{item.sku || '—'}</Descriptions.Item>
        <Descriptions.Item label='Kategorija'>
          <Tag>{categoryLabels[item.category] || item.category}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label='Jedinica'>{item.unit || '—'}</Descriptions.Item>
        <Descriptions.Item label='Količina na stanju'>
          <span style={{ color: isLowStock ? '#ff4d4f' : undefined, fontWeight: 'bold' }}>
            {item.quantityOnHand} {item.unit || ''}
          </span>
          {isLowStock && <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />}
        </Descriptions.Item>
        <Descriptions.Item label='Min. nivo za naručivanje'>
          {item.reorderLevel != null ? item.reorderLevel : '—'}
        </Descriptions.Item>
        <Descriptions.Item label='Nabavna cena'>
          {item.costPrice != null ? `${Number(item.costPrice).toFixed(2)} RSD` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label='Prodajna cena'>
          {item.sellPrice != null ? `${Number(item.sellPrice).toFixed(2)} RSD` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label='Rok trajanja'>
          {item.expiryDate ? dayjs(item.expiryDate).format('DD.MM.YYYY') : '—'}
        </Descriptions.Item>
        <Descriptions.Item label='Lokacija'>{item.locationName || '—'}</Descriptions.Item>
        <Descriptions.Item label='Status'>
          <Tag color={item.active ? 'green' : 'default'}>
            {item.active ? 'Aktivan' : 'Neaktivan'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
      <Button
        icon={<EditOutlined />}
        style={{ marginTop: 16 }}
        onClick={() => setEditModalOpen(true)}
      >
        Izmeni
      </Button>
    </Card>
  );

  const transactionsTab = (
    <div>
      <Button type='primary' onClick={() => setTxModalOpen(true)} style={{ marginBottom: 16 }}>
        Nova transakcija
      </Button>
      <Table
        dataSource={txData?.data ?? []}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          {
            title: 'Datum',
            dataIndex: 'createdAt',
            width: 140,
            render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm'),
          },
          {
            title: 'Tip',
            dataIndex: 'type',
            width: 100,
            render: (val: InventoryTransactionType) => {
              const info = txTypeLabels[val] || { text: val, color: 'default' };
              return <Tag color={info.color}>{info.text}</Tag>;
            },
          },
          {
            title: 'Količina',
            dataIndex: 'quantity',
            width: 100,
            align: 'right',
          },
          {
            title: 'Razlog',
            dataIndex: 'reason',
            width: 140,
            render: (val: AdjustmentReason | null) => (val ? reasonLabels[val] || val : '—'),
          },
          {
            title: 'Izvršio',
            dataIndex: 'performedByName',
            render: (val: string | null) => val || '—',
          },
          {
            title: 'Napomena',
            dataIndex: 'note',
            ellipsis: true,
            render: (val: string | null) => val || '—',
          },

          {
            title: 'Referenca',
            dataIndex: 'referenceType',
            width: 100,
            render: (val: string | null) => val || '—',
          },
        ]}
      />
    </div>
  );

  const linkedServicesTab = (
    <Table
      dataSource={linkedServicesData?.data ?? []}
      rowKey='id'
      pagination={false}
      size='small'
      columns={[
        {
          title: 'Usluga',
          dataIndex: 'serviceName',
        },
        {
          title: 'Količina po korišćenju',
          dataIndex: 'quantityPerUse',
          width: 180,
          align: 'right',
        },
        {
          title: 'Jedinica',
          dataIndex: 'unit',
          width: 80,
          render: (val: string) => val || '—',
        },
      ]}
    />
  );

  const batchStatusInfo = (status: string): { color: string; text: string } => {
    if (status === 'EXPIRED') return { color: 'red', text: 'Istekao' };
    if (status === 'EXPIRING_SOON') return { color: 'orange', text: 'Uskoro ističe' };
    return { color: 'green', text: 'OK' };
  };

  const batchesTab = (
    <div>
      <Button
        type='primary'
        onClick={() => {
          setEditingBatch(null);
          setBatchModalOpen(true);
        }}
        style={{ marginBottom: 16 }}
      >
        Novi lot
      </Button>
      <Table
        dataSource={batches}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          {
            title: 'Broj lota',
            dataIndex: 'batchNumber',
            width: 160,
          },
          {
            title: 'Rok trajanja',
            dataIndex: 'expiryDate',
            width: 130,
            render: (val: string | null) => (val ? dayjs(val).format('DD.MM.YYYY') : '—'),
          },
          {
            title: 'Dana do isteka',
            dataIndex: 'daysUntilExpiry',
            width: 120,
            align: 'right',
            render: (val: number | null) => (val == null ? '—' : val),
          },
          {
            title: 'Količina',
            dataIndex: 'quantityOnHand',
            width: 110,
            align: 'right',
            render: (val: number) => `${val} ${item.unit || ''}`,
          },
          {
            title: 'Dobavljač',
            dataIndex: 'supplier',
            ellipsis: true,
            render: (val: string | null) => val || '—',
          },
          {
            title: 'Primljeno',
            dataIndex: 'receivedAt',
            width: 110,
            render: (val: string) => dayjs(val).format('DD.MM.YYYY'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            render: (val: string) => {
              const info = batchStatusInfo(val);
              return <Tag color={info.color}>{info.text}</Tag>;
            },
          },
          {
            title: 'Akcije',
            width: 160,
            render: (_: unknown, record: InventoryBatch) => (
              <Space size='small'>
                <Button
                  size='small'
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingBatch(record);
                    setBatchModalOpen(true);
                  }}
                >
                  Izmeni
                </Button>
                <Popconfirm
                  title='Obrisati lot?'
                  description='Lot mora biti prazan da bi se mogao obrisati.'
                  onConfirm={() => deleteBatchMutation.mutate(record.id)}
                  okText='Da'
                  cancelText='Ne'
                  disabled={record.quantityOnHand > 0}
                >
                  <Button size='small' danger disabled={record.quantityOnHand > 0}>
                    Obriši
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory')}>
          Nazad
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {item.name}
          {item.sku && (
            <Typography.Text type='secondary' style={{ marginLeft: 8 }}>
              ({item.sku})
            </Typography.Text>
          )}
          {isLowStock && (
            <Tag color='red' style={{ marginLeft: 8 }}>
              <WarningOutlined /> Nizak nivo
            </Tag>
          )}
        </Typography.Title>
      </Space>

      <Tabs
        defaultActiveKey='info'
        items={[
          { key: 'info', label: 'Informacije', children: infoTab },
          {
            key: 'transactions',
            label: `Transakcije (${txData?.data?.length ?? 0})`,
            children: transactionsTab,
          },
          {
            key: 'services',
            label: `Povezane usluge (${linkedServicesData?.data?.length ?? 0})`,
            children: linkedServicesTab,
          },
          ...(item.trackBatches
            ? [
                {
                  key: 'batches',
                  label: `Lotovi (${batches.length})`,
                  children: batchesTab,
                },
              ]
            : []),
        ]}
      />

      <InventoryItemModal
        open={editModalOpen}
        item={item}
        onClose={() => {
          setEditModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
        }}
      />

      <InventoryTransactionModal
        open={txModalOpen}
        transaction={null}
        onClose={() => {
          setTxModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory-transactions-by-item', id] });
          queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
        }}
        defaultItemId={id}
      />

      {item.trackBatches && (
        <InventoryBatchModal
          open={batchModalOpen}
          inventoryItemId={id!}
          batch={editingBatch}
          onClose={() => setBatchModalOpen(false)}
        />
      )}
    </div>
  );
}
