import { useEffect, useState } from 'react';
import { Modal, Form, Input, Switch, Select, Button, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { treatmentProtocolsApi, diagnosesApi } from '@/api';
import type {
  TreatmentProtocol,
  CreateTreatmentProtocolRequest,
  UpdateTreatmentProtocolRequest,
} from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import ProtocolItemsTable from './ProtocolItemsTable';

interface ProtocolModalProps {
  open: boolean;
  protocol: TreatmentProtocol | null;
  onClose: () => void;
}

export default function ProtocolModal({ open, protocol, onClose }: ProtocolModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [createdProtocol, setCreatedProtocol] = useState<TreatmentProtocol | null>(null);

  const currentProtocol = protocol ?? createdProtocol;
  const isEditing = !!currentProtocol;

  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const debouncedDiagnosisSearch = useDebouncedValue(diagnosisSearch, 300);

  const { data: diagnosisData } = useQuery({
    queryKey: ['diagnoses-autocomplete', debouncedDiagnosisSearch],
    queryFn: () => diagnosesApi.autocomplete(0, 20, debouncedDiagnosisSearch || undefined),
  });

  // Dohvati izabranu dijagnozu ako nije u listi (Select UUID fix)
  const selectedDiagnosisId = Form.useWatch('diagnosisId', form);
  const { data: selectedDiagnosis } = useQuery({
    queryKey: ['diagnosis', selectedDiagnosisId],
    queryFn: () => diagnosesApi.getById(selectedDiagnosisId!),
    enabled: !!selectedDiagnosisId,
  });

  const diagnosisOptions = (() => {
    const options = (diagnosisData?.content ?? []).map((d) => ({
      label: `${d.code ? d.code + ' — ' : ''}${d.name}`,
      value: d.id,
    }));
    // Dodaj izabranu ako nije u listi
    if (selectedDiagnosis && !options.find((o) => o.value === selectedDiagnosis.id)) {
      options.unshift({
        label: `${selectedDiagnosis.code ? selectedDiagnosis.code + ' — ' : ''}${selectedDiagnosis.name}`,
        value: selectedDiagnosis.id,
      });
    }
    return options;
  })();

  useEffect(() => {
    if (open) {
      if (protocol) {
        form.setFieldsValue(protocol);
      } else {
        form.resetFields();
        form.setFieldsValue({ active: true });
        setCreatedProtocol(null);
      }
    }
  }, [open, protocol, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTreatmentProtocolRequest) => treatmentProtocolsApi.create(data),
    onSuccess: (result) => {
      message.success('Protokol kreiran — dodajte usluge');
      queryClient.invalidateQueries({ queryKey: ['treatment-protocols'] });
      setCreatedProtocol(result);
    },
    onError: () => message.error('Greška pri kreiranju'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTreatmentProtocolRequest) =>
      treatmentProtocolsApi.update(currentProtocol!.id, data),
    onSuccess: () => {
      message.success('Protokol izmenjen');
      queryClient.invalidateQueries({ queryKey: ['treatment-protocols'] });
      onClose();
    },
    onError: () => message.error('Greška pri izmeni'),
  });

  const handleSubmit = (values: CreateTreatmentProtocolRequest) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? `Protokol: ${currentProtocol?.name ?? ''}` : 'Novi protokol'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={700}
      style={{ top: 20 }}
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Form.Item
          name='name'
          label='Naziv protokola'
          rules={[{ required: true, message: 'Unesite naziv protokola' }]}
        >
          <Input placeholder='npr. Dermatitis - osnovni tretman' />
        </Form.Item>

        <Form.Item name='diagnosisId' label='Povezana dijagnoza (opciono)'>
          <Select
            showSearch
            allowClear
            placeholder='Izaberite dijagnozu...'
            options={diagnosisOptions}
            filterOption={false}
            onSearch={(value) => setDiagnosisSearch(value)}
            onInputKeyDown={(e) => {
              if (e.key === ' ') e.stopPropagation();
            }}
          />
        </Form.Item>

        <Form.Item name='description' label='Opis'>
          <Input.TextArea rows={2} placeholder='Kratak opis protokola (opciono)' />
        </Form.Item>

        <Form.Item name='active' label='Aktivan' valuePropName='checked'>
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            {isEditing ? 'Zatvori' : 'Otkaži'}
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj protokol'}
          </Button>
        </Form.Item>
      </Form>

      {isEditing && (
        <>
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 16, paddingTop: 8 }}>
            <strong>Usluge u protokolu:</strong>
          </div>
          <ProtocolItemsTable protocolId={currentProtocol?.id ?? null} />
        </>
      )}
    </Modal>
  );
}
