import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Input,
  InputNumber,
  Switch,
  DatePicker,
  Row,
  Tabs,
  Col,
  Space,
  Alert,
} from 'antd';
import { DollarOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { medicalRecordsApi } from '@/api/medical-records';
import { petsApi } from '@/api/pets';
import { usersApi } from '@/api/users';
import { appointmentsApi } from '@/api/appointments';
import { diagnosesApi } from '@/api/diagnoses';
import { treatmentProtocolsApi } from '@/api/treatment-protocols';
import type {
  MedicalRecord,
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest,
  ApplyProtocolRequest,
} from '@/types';
import dayjs from 'dayjs';
import TreatmentItemsTable from './TreatmentItemsTable';
import LabReportItemsTable from './LabReportItemsTable';
import VaccinationItemsTable from './VaccinationItemsTable';
import PrescriptionItemsTable from './PrescriptionItemsTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { invoicesApi } from '@/api/invoices';
import InvoiceModal from '@/pages/invoices/InvoiceModal';
import { useAuthStore } from '@/store/authStore';

interface MedicalRecordModalProps {
  open: boolean;
  record: MedicalRecord | null;
  onClose: () => void;
  defaultValues?: { petId?: string; vetId?: string; appointmentId?: string; symptoms?: string };
}

export default function MedicalRecordModal({
  open,
  record,
  onClose,
  defaultValues,
}: MedicalRecordModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [createdRecord, setCreatedRecord] = useState<MedicalRecord | null>(null);
  const currentRecord = record ?? createdRecord;
  const [petSearch, setPetSearch] = useState('');
  const debouncedPetSearch = useDebouncedValue(petSearch, 300);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const debouncedAppointmentSearch = useDebouncedValue(appointmentSearch, 300);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Dijagnoza autocomplete
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const debouncedDiagnosisSearch = useDebouncedValue(diagnosisSearch, 300);
  const [selectedDiagnosisIds, setSelectedDiagnosisIds] = useState<string[]>([]);
  const [diagnosisChanged, setDiagnosisChanged] = useState(false);
  const [diagnosisDropdownOpen, setDiagnosisDropdownOpen] = useState(false);

  const [appliedProtocolIds, setAppliedProtocolIds] = useState<Set<string>>(new Set());

  // Protokol ručni izbor
  const [protocolSearch, setProtocolSearch] = useState('');
  const debouncedProtocolSearch = useDebouncedValue(protocolSearch, 300);

  const { data: diagnosisSuggestions } = useQuery({
    queryKey: ['diagnoses-autocomplete', debouncedDiagnosisSearch],
    queryFn: () => diagnosesApi.autocomplete(0, 20, debouncedDiagnosisSearch || undefined),
  });

  const isEditMode = !!currentRecord;

  const { data: suggestedProtocols } = useQuery({
    queryKey: ['protocols-by-diagnoses', selectedDiagnosisIds],
    queryFn: async () => {
      const results = await Promise.all(
        selectedDiagnosisIds.map((id) => treatmentProtocolsApi.getByDiagnosis(id)),
      );
      const map = new Map();
      results.flat().forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    },
    enabled: selectedDiagnosisIds.length > 0 && isEditMode,
  });

  const { data: allProtocolsData } = useQuery({
    queryKey: ['treatment-protocols-search', debouncedProtocolSearch],
    queryFn: () => treatmentProtocolsApi.getAll(0, 20, debouncedProtocolSearch || undefined),
    enabled: isEditMode,
  });

  const followUpRecommended = Form.useWatch('followUpRecommended', form);

  const currentUser = useAuthStore((s) => s.user);

  const { data: petsData } = useQuery({
    queryKey: ['pets-search', debouncedPetSearch],
    queryFn: () => petsApi.getAll(0, 20, debouncedPetSearch || undefined).then((r) => r.data),
  });

  const petIdToFetch = defaultValues?.petId || record?.petId;

  const { data: selectedPet } = useQuery({
    queryKey: ['pet', petIdToFetch],
    queryFn: () => petsApi.getById(petIdToFetch!).then((r) => r.data),
    enabled: !!petIdToFetch,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments-search', debouncedAppointmentSearch],
    queryFn: () =>
      appointmentsApi
        .getAll(0, 20, 'startTime,desc', debouncedAppointmentSearch || undefined)
        .then((r) => r.data),
  });

  const { data: linkedInvoice } = useQuery({
    queryKey: ['invoice-by-record', currentRecord?.id],
    queryFn: () => invoicesApi.getByMedicalRecord(currentRecord!.id).then((r) => r.data),
    enabled: !!currentRecord?.id,
    retry: false,
  });

  const handlePrintInvoice = async () => {
    if (!linkedInvoice) return;
    try {
      const response = await invoicesApi.downloadPdf(linkedInvoice.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      message.error('Greška pri generisanju PDF-a!');
    }
  };

  useEffect(() => {
    if (open) {
      setDiagnosisChanged(false);
      setAppliedProtocolIds(new Set());

      if (record) {
        form.setFieldsValue({
          ...record,
          diagnosisIds: record.diagnoses?.map((d) => d.id) ?? [],
          followUpDate: record.followUpDate ? dayjs(record.followUpDate) : null,
        });
        setSelectedDiagnosisIds(record.diagnoses?.map((d) => d.id) ?? []);
      } else {
        form.resetFields();
        setCreatedRecord(null);
        setSelectedDiagnosisIds([]);
        setDiagnosisSearch('');
        setProtocolSearch('');

        if (defaultValues) {
          form.setFieldsValue(defaultValues);
        }
        if (!defaultValues?.vetId && currentUser?.id && currentUser.roleName !== 'SUPER_ADMIN') {
          form.setFieldsValue({ vetId: currentUser.id });
        }
      }
    }
  }, [open, record, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordRequest) => medicalRecordsApi.create(data),
    onSuccess: (response) => {
      message.success(
        'Intervencija je kreirana! Sada možete dodati usluge, vakcinacije i lab izveštaje.',
      );
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      setCreatedRecord(response.data);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('medical_record_appointment_id_key')) {
        message.warning('Za ovaj termin već postoji intervencija!');
      } else {
        message.error('Greška pri kreiranju!');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMedicalRecordRequest) =>
      medicalRecordsApi.update(currentRecord!.id, data),
    onSuccess: () => {
      message.success('Intervencija je izmenjena!');
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni!'),
  });

  const applyProtocolMutation = useMutation({
    mutationFn: (req: ApplyProtocolRequest) => treatmentProtocolsApi.apply(req),
    onSuccess: (treatments, req) => {
      message.success(`Protokol primenjen (${treatments.length} usluga dodato)`);
      setAppliedProtocolIds((prev) => new Set(prev).add(req.protocolId));
      queryClient.invalidateQueries({ queryKey: ['treatments', currentRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-by-record', currentRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
    },

    onError: () => message.error('Greška pri primeni protokola'),
  });

  const createDiagnosisMutation = useMutation({
    mutationFn: (name: string) => diagnosesApi.create({ name, active: true }),
    onSuccess: (newDiag) => {
      const currentIds = form.getFieldValue('diagnosisIds') || [];
      const updatedIds = [...currentIds, newDiag.id];
      form.setFieldsValue({ diagnosisIds: updatedIds });
      setSelectedDiagnosisIds(updatedIds);
      setDiagnosisChanged(true);
      setDiagnosisSearch('');
      queryClient.invalidateQueries({ queryKey: ['diagnoses-autocomplete'] });
      message.success(`Dijagnoza "${newDiag.name}" dodata u šifarnik`);
    },
    onError: () => message.error('Greška pri kreiranju dijagnoze'),
  });

  const handleApplyProtocol = (protocolId: string, protocolName: string) => {
    Modal.confirm({
      title: 'Primena protokola',
      content: `Da li želite da primenite protokol "${protocolName}"? Sve usluge iz protokola će biti dodate.`,
      okText: 'Primeni',
      cancelText: 'Otkaži',
      onOk: () =>
        applyProtocolMutation.mutate({
          protocolId,
          medicalRecordId: currentRecord!.id,
          vetId: currentRecord!.vetId,
        }),
    });
  };

  const handleSubmit = (values: CreateMedicalRecordRequest & { followUpDate?: dayjs.Dayjs }) => {
    const payload = {
      ...values,
      appointmentId: values.appointmentId ?? null,
      followUpRecommended: values.followUpRecommended ?? false,
      followUpDate: values.followUpDate ? values.followUpDate.format('YYYY-MM-DD') : null,
    };
    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const petOptions = useMemo(() => {
    const options =
      petsData?.content.map((p) => ({
        label: `${p.name}${p.speciesName ? ' (' + p.speciesName + ')' : ''} — ${p.ownerName || 'Bez vlasnika'}`,
        value: p.id,
      })) ?? [];

    if (selectedPet && !options.find((o) => o.value === selectedPet.id)) {
      options.unshift({
        label: `${selectedPet.name}${selectedPet.speciesName ? ' (' + selectedPet.speciesName + ')' : ''} — ${selectedPet.ownerName || 'Bez vlasnika'}`,
        value: selectedPet.id,
      });
    }

    return options;
  }, [petsData, selectedPet]);

  const diagnosisOptions = useMemo(() => {
    const options =
      diagnosisSuggestions?.content?.map((d) => ({
        value: d.id,
        label: `${d.code ? d.code + ' — ' : ''}${d.name}`,
      })) ?? [];

    // Dodaj već izabrane dijagnoze iz recorda ako nisu u listi
    if (record?.diagnoses) {
      for (const d of record.diagnoses) {
        if (!options.find((o) => o.value === d.id)) {
          options.unshift({
            value: d.id,
            label: `${d.code ? d.code + ' — ' : ''}${d.name}`,
          });
        }
      }
    }

    // Opcija "Dodaj u šifarnik" kad pretraga ne pronađe tačan rezultat
    if (
      diagnosisSearch.trim() &&
      !options.some((o) => o.label.toLowerCase() === diagnosisSearch.trim().toLowerCase())
    ) {
      options.push({
        value: `__create__${diagnosisSearch.trim()}`,
        label: `+ Dodaj "${diagnosisSearch.trim()}" u šifarnik`,
      });
    }

    return options;
  }, [diagnosisSuggestions, record, diagnosisSearch]);

  const vetOptions =
    usersData?.content
      .filter((u) => u.roleName !== 'SUPER_ADMIN')
      .map((u) => ({
        label: `${u.firstName} ${u.lastName}`,
        value: u.id,
      })) ?? [];

  const appointmentOptions =
    appointmentsData?.content.map((a) => ({
      label: `${dayjs(a.startTime).format('DD.MM.YYYY HH:mm')} - ${a.petName} (${a.ownerName})`,
      value: a.id,
    })) ?? [];

  return (
    <Modal
      title={
        isEditMode
          ? `Izmeni intervenciju${currentRecord?.recordCode ? ' — ' + currentRecord.recordCode : ''}`
          : 'Nova intervencija'
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1000}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        style={{ marginTop: 4 }}
        className='compact-medical-form'
      >
        {/* Red 1: Termin, Veterinar, Ljubimac, Simptomi */}
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name='appointmentId' label='Termin (opciono)'>
              <Select
                placeholder='Izaberite termin...'
                options={appointmentOptions}
                showSearch
                allowClear
                filterOption={false}
                onSearch={(value) => setAppointmentSearch(value)}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='vetId'
              label='Veterinar'
              rules={[{ required: true, message: 'Izaberite veterinara!' }]}
            >
              <Select
                placeholder='Izaberite veterinara...'
                options={vetOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onInputKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='petId'
              label='Ljubimac'
              rules={[{ required: true, message: 'Izaberite ljubimca!' }]}
            >
              <Select
                placeholder='Izaberite ljubimca...'
                options={petOptions}
                showSearch
                filterOption={false}
                onSearch={(value) => setPetSearch(value)}
                onInputKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='symptoms' label='Simptomi'>
              <Input placeholder='Simptomi...' />
            </Form.Item>
          </Col>
        </Row>

        {/* Red 2: Dijagnoza, Beleške sa pregleda */}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name='diagnosisIds' label='Dijagnoze'>
              <Select
                mode='multiple'
                showSearch
                filterOption={false}
                placeholder='Pretraži dijagnoze...'
                open={diagnosisDropdownOpen}
                onDropdownVisibleChange={setDiagnosisDropdownOpen}
                onSearch={(value) => setDiagnosisSearch(value)}
                onChange={(values: string[]) => {
                  const createValue = values.find((v) => v.startsWith('__create__'));
                  if (createValue) {
                    const name = createValue.replace('__create__', '');
                    // Ukloni placeholder, zadrži ostale
                    const cleanIds = values.filter((v) => !v.startsWith('__create__'));
                    form.setFieldsValue({ diagnosisIds: cleanIds });
                    setSelectedDiagnosisIds(cleanIds);
                    createDiagnosisMutation.mutate(name);
                  } else {
                    setSelectedDiagnosisIds(values);
                  }
                  setDiagnosisChanged(true);
                }}
                onSelect={() => setDiagnosisDropdownOpen(false)}
                options={diagnosisOptions}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name='examinationNotes' label='Beleške sa pregleda'>
              <Input.TextArea placeholder='Beleške...' rows={2} />
            </Form.Item>
          </Col>
        </Row>

        {/* Predlog protokola na osnovu dijagnoze */}
        {suggestedProtocols && suggestedProtocols.length > 0 && isEditMode && diagnosisChanged && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 8 }}
            message='Dostupni protokoli za izabrane dijagnoze:'
            description={
              <div>
                {selectedDiagnosisIds.map((diagId) => {
                  const diag = diagnosisOptions.find((d) => d.value === diagId);
                  const protocols = suggestedProtocols.filter((p) => p.diagnosisId === diagId);
                  if (!protocols.length) return null;
                  return (
                    <div key={diagId} style={{ marginBottom: 4 }}>
                      <strong>{diag?.label || diagId}:</strong>{' '}
                      <Space wrap>
                        {protocols.map((p) => (
                          <Button
                            key={p.id}
                            size='small'
                            type='link'
                            loading={applyProtocolMutation.isPending}
                            disabled={appliedProtocolIds.has(p.id)}
                            onClick={() => handleApplyProtocol(p.id, p.name)}
                          >
                            {appliedProtocolIds.has(p.id) ? '✓ Primenjen' : p.name}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  );
                })}
              </div>
            }
          />
        )}

        {/* Red 3: Težina, Temperatura, Puls, Preporučena kontrola, Datum kontrole */}
        <Row gutter={12}>
          <Col span={4}>
            <Form.Item name='weightKg' label='Težina (kg)'>
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} placeholder='0.0' />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='temperatureC' label='Temperatura (°C)'>
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={45}
                step={0.1}
                placeholder='38.5'
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='heartRate' label='Puls (bpm)'>
              <InputNumber style={{ width: '100%' }} min={0} max={300} placeholder='80' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='followUpRecommended'
              label='Preporučena kontrola'
              valuePropName='checked'
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='followUpDate' label='Datum kontrole'>
              <DatePicker
                style={{ width: '100%' }}
                format='DD.MM.YYYY'
                disabled={!followUpRecommended}
              />
            </Form.Item>
          </Col>
        </Row>

        {isEditMode && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>Faktura:</span>
              <Space>
                {linkedInvoice ? (
                  <>
                    <Button
                      icon={<DollarOutlined />}
                      size='small'
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      {linkedInvoice.invoiceNumber} — {linkedInvoice.status}
                    </Button>
                    <Button icon={<FilePdfOutlined />} size='small' onClick={handlePrintInvoice}>
                      Štampaj fakturu
                    </Button>
                  </>
                ) : (
                  <Button
                    icon={<DollarOutlined />}
                    size='small'
                    type='dashed'
                    onClick={() => setInvoiceModalOpen(true)}
                  >
                    Kreiraj fakturu
                  </Button>
                )}
              </Space>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>Protokol:</span>
              <Select
                showSearch
                allowClear
                filterOption={false}
                placeholder='Izaberi protokol za primenu...'
                style={{ width: 350 }}
                value={null}
                onSearch={(value) => setProtocolSearch(value)}
                onSelect={(protocolId) => {
                  const p = allProtocolsData?.content?.find((x) => x.id === protocolId);
                  if (p) handleApplyProtocol(p.id, p.name);
                }}
                onInputKeyDown={(e) => {
                  if (e.key === ' ') e.stopPropagation();
                }}
                options={
                  allProtocolsData?.content
                    ?.filter((p) => !appliedProtocolIds.has(p.id))
                    .map((p) => ({
                      label: p.name,
                      value: p.id,
                    })) ?? []
                }
              />
            </div>

            <Tabs
              style={{ marginTop: 8 }}
              items={[
                {
                  key: 'treatments',
                  label: 'Usluge',
                  children: (
                    <TreatmentItemsTable
                      medicalRecordId={currentRecord?.id ?? null}
                      vetId={currentRecord?.vetId ?? ''}
                    />
                  ),
                },
                {
                  key: 'vaccinations',
                  label: 'Vakcinacije',
                  children: (
                    <VaccinationItemsTable
                      medicalRecordId={currentRecord?.id ?? null}
                      petId={currentRecord?.petId ?? ''}
                      vetId={currentRecord?.vetId ?? ''}
                    />
                  ),
                },
                {
                  key: 'lab-reports',
                  label: 'Lab izveštaji',
                  children: (
                    <LabReportItemsTable
                      medicalRecordId={currentRecord?.id ?? null}
                      petId={currentRecord?.petId ?? ''}
                    />
                  ),
                },
                {
                  key: 'prescriptions',
                  label: 'Recepti',
                  children: (
                    <PrescriptionItemsTable
                      medicalRecordId={currentRecord?.id ?? null}
                      petId={currentRecord?.petId ?? ''}
                      vetId={currentRecord?.vetId ?? ''}
                    />
                  ),
                },
              ]}
            />
          </>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditMode ? 'Sačuvaj izmene' : 'Kreiraj intervenciju'}
          </Button>
        </Form.Item>
      </Form>
      <InvoiceModal
        open={invoiceModalOpen}
        invoice={linkedInvoice ?? null}
        onClose={() => {
          setInvoiceModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['invoice-by-record', currentRecord?.id] });
        }}
        defaultValues={{
          ownerId: currentRecord?.ownerId,
          medicalRecordId: currentRecord?.id,
        }}
      />
    </Modal>
  );
}
