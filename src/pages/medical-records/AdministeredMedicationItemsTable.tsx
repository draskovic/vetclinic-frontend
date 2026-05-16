import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  DatePicker,
  Row,
  Col,
  Typography,
  Tooltip,
  AutoComplete,
  Select,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { medicationAdministrationsApi } from '@/api/medication-administrations';
import { inventoryItemsApi } from '@/api/inventory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { MedicationAdministration, MedicationRoute, InventoryItem } from '@/types';
import dayjs from 'dayjs';
import { ROUTE_OPTIONS, ROUTE_LABEL } from '@/constants/medicationRoutes';
import BulkAdministerMedicationsModal from './BulkAdministerMedicationsModal';

interface AdministeredMedicationItemsTableProps {
  medicalRecordId: string | null;
  petId: string;
  vetId: string;
}

export default function AdministeredMedicationItemsTable({
  medicalRecordId,
  petId,
  vetId,
}: AdministeredMedicationItemsTableProps) {
  const [items, setItems] = useState<MedicationAdministration[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState<MedicationRoute | null>(null);
  const [administeredDate, setAdministeredDate] = useState<dayjs.Dayjs>(dayjs());
  const [instructions, setInstructions] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const debouncedMedicationSearch = useDebouncedValue(medicationSearch, 300);

  const { data: itemsData, refetch } = useQuery({
    queryKey: ['med-admin-by-mr', medicalRecordId],
    queryFn: () => medicationAdministrationsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  const { data: medicationsData } = useQuery({
    queryKey: ['inventory-medications-search', debouncedMedicationSearch],
    queryFn: () =>
      inventoryItemsApi.getAll(0, 20, debouncedMedicationSearch || undefined, 'MEDICATION'),
    enabled: adding,
  });

  const medications: InventoryItem[] = medicationsData?.data?.content ?? [];

  useEffect(() => {
    if (itemsData) {
      setItems(itemsData.data);
    }
  }, [itemsData]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        // Primarno: datum primene DESC (najnoviji prvo)
        const dateCmp = b.administeredDate.localeCompare(a.administeredDate);
        if (dateCmp !== 0) return dateCmp;
        // Tie-breaker: createdAt ASC (hronološki redosled unosa)
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [items],
  );

  const resetForm = () => {
    setMedicationName('');
    setDosage('');
    setRoute(null);
    setAdministeredDate(dayjs());
    setInstructions('');
    setMedicationSearch('');
    setInventoryItemId(null);
    setEditingId(null);
    setAdding(false);
  };

  const handleStartEdit = (record: MedicationAdministration) => {
    setMedicationName(record.medicationName);
    setDosage(record.dosage ?? '');
    setRoute(record.route);
    setAdministeredDate(dayjs(record.administeredDate));
    setInstructions(record.instructions ?? '');
    setInventoryItemId(record.inventoryItemId);
    setMedicationSearch(record.medicationName);
    setEditingId(record.id);
    setAdding(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        medicationName,
        dosage: dosage.trim() || null,
        route: route,
        administeredDate: administeredDate.format('YYYY-MM-DD'),
        instructions: instructions.trim() || null,
        inventoryItemId: inventoryItemId,
      };
      console.log('[saveMutation] editingId:', editingId, 'payload:', payload); // ← privremeno
      if (editingId) {
        return medicationAdministrationsApi.update(editingId, payload);
      }
      return medicationAdministrationsApi.create({
        medicalRecordId: medicalRecordId!,
        petId,
        vetId,
        ...payload,
      });
    },
    onSuccess: () => {
      message.success(editingId ? 'Izmene sačuvane!' : 'Lek evidentiran!');
      resetForm();
      refetch();
    },
    onError: () => message.error('Greška pri snimanju!'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicationAdministrationsApi.delete(id),
    onSuccess: () => {
      message.success('Evidencija uklonjena!');
      refetch();
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const handleMedicationNameChange = (value: string) => {
    setMedicationName(value);
    setMedicationSearch(value);
    const matched = medications.find((m) => m.name === value);
    setInventoryItemId(matched?.id ?? null);
  };

  const isFormValid = medicationName.trim() && administeredDate;

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre evidentiranja aplikovanih lekova.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={sortedItems}
        rowKey='id'
        pagination={false}
        size='small'
        columns={[
          { title: 'Lek', dataIndex: 'medicationName', key: 'medicationName' },
          {
            title: 'Doza',
            dataIndex: 'dosage',
            key: 'dosage',
            render: (v: string | null) => v || '-',
          },
          {
            title: 'Način primene',
            dataIndex: 'route',
            key: 'route',
            width: 90,
            render: (v: MedicationRoute | null) => (v ? ROUTE_LABEL[v] : '-'),
          },
          {
            title: 'Datum',
            dataIndex: 'administeredDate',
            key: 'administeredDate',
            width: 110,
            render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
          },
          {
            title: 'Beleška',
            dataIndex: 'instructions',
            key: 'instructions',
            ellipsis: true,
            render: (v: string | null) => v || '-',
          },
          {
            title: '',
            key: 'actions',
            width: 90,
            render: (_, rec) => (
              <Space size={2}>
                <Tooltip title='Izmeni'>
                  <Button
                    type='text'
                    icon={<EditOutlined />}
                    size='small'
                    onClick={() => handleStartEdit(rec)}
                  />
                </Tooltip>
                <Tooltip title='Ukloni'>
                  <Popconfirm
                    title='Ukloniti evidenciju?'
                    onConfirm={() => deleteMutation.mutate(rec.id)}
                  >
                    <Button type='text' danger icon={<DeleteOutlined />} size='small' />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]}
        title={() =>
          adding ? (
            <div>
              {editingId && (
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Izmena unosa
                </Typography.Text>
              )}
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={8}>
                  <AutoComplete
                    placeholder='Naziv leka *'
                    value={medicationName}
                    onChange={handleMedicationNameChange}
                    style={{ width: '100%' }}
                    filterOption={false}
                    onInputKeyDown={(e) => {
                      if (e.key === ' ') e.stopPropagation();
                    }}
                    options={medications.map((item) => ({
                      value: item.name,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.name}</span>
                          <span style={{ color: '#52c41a', fontSize: 12 }}>
                            {item.quantityOnHand > 0
                              ? `${item.quantityOnHand} ${item.unit ?? ''}`
                              : 'Van lagera'}
                          </span>
                        </div>
                      ),
                    }))}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder='Doza (npr. 0.5 ml)'
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </Col>
                <Col span={5}>
                  <Select
                    placeholder='Način primene'
                    value={route}
                    onChange={(v) => setRoute(v)}
                    options={ROUTE_OPTIONS}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={5}>
                  <DatePicker
                    placeholder='Datum primene *'
                    value={administeredDate}
                    onChange={(val) => val && setAdministeredDate(val)}
                    format='DD.MM.YYYY'
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
              <Row gutter={8} style={{ marginBottom: 8 }}>
                <Col span={24}>
                  <Input
                    placeholder='Beleška (opciono)'
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </Col>
              </Row>
              <Space style={{ marginTop: 8 }}>
                <Button
                  type='primary'
                  icon={<SaveOutlined />}
                  disabled={!isFormValid}
                  loading={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {editingId ? 'Sačuvaj izmene' : 'Sačuvaj'}
                </Button>
                <Button icon={<CloseOutlined />} onClick={resetForm}>
                  Otkaži
                </Button>
              </Space>
            </div>
          ) : (
            <Space>
              <Button type='dashed' icon={<PlusOutlined />} onClick={() => setAdding(true)}>
                Evidentiraj aplikovan lek
              </Button>
              <Button
                type='primary'
                icon={<ThunderboltOutlined />}
                onClick={() => setBulkOpen(true)}
              >
                Brzi unos više lekova
              </Button>
            </Space>
          )
        }
      />
      {bulkOpen && (
        <BulkAdministerMedicationsModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onSuccess={() => refetch()}
          medicalRecordId={medicalRecordId}
          petId={petId}
          vetId={vetId}
        />
      )}
    </div>
  );
}
