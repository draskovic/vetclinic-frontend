import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Input,
  DatePicker,
  Row,
  Col,
  Switch,
  Upload,
  Space,
  Typography,
  Spin,
} from 'antd';
import {
  DeleteOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { labReportsApi } from '@/api/lab-reports';
import { petsApi } from '@/api/pets';
import { usersApi } from '@/api/users';
import type {
  LabReport,
  CreateLabReportRequest,
  UpdateLabReportRequest,
  LabReportStatus,
} from '@/types';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

const statusOptions: { label: string; value: LabReportStatus }[] = [
  { label: 'Na čekanju', value: 'PENDING' },
  { label: 'Završen', value: 'COMPLETED' },
  { label: 'Otkazan', value: 'CANCELLED' },
];

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  return fallback;
};

interface LabReportModalProps {
  open: boolean;
  labReport: LabReport | null;
  onClose: () => void;
  medicalRecordId?: string; // dodaj ovo
  petId?: string; // da se sakrije select za ljubimca
}

export default function LabReportModal({
  open,
  labReport,
  onClose,
  medicalRecordId,
  petId,
}: LabReportModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!labReport;

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const { data: petsData } = useQuery({
    queryKey: ['pets-all'],
    queryFn: () => petsApi.getAll(0, 100).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (labReport) {
        form.setFieldsValue({
          ...labReport,
          requestedAt: dayjs(labReport.requestedAt),
          completedAt: labReport.completedAt ? dayjs(labReport.completedAt) : null,
        });
      } else {
        form.resetFields();
        if (medicalRecordId) form.setFieldValue('medicalRecordId', medicalRecordId);
        if (petId) form.setFieldValue('petId', petId);
      }
      setFileToUpload(null);
      setFileList([]);
      setIsParsing(false);
    }
  }, [open, labReport, form, medicalRecordId, petId]);

  const uploadFileMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => labReportsApi.uploadFile(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri upload-u fajla!')),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => labReportsApi.deleteFile(id),
    onSuccess: () => {
      message.success('Fajl je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri brisanju fajla!')),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLabReportRequest) => labReportsApi.create(data),
    onSuccess: async (response) => {
      const createdReport = response.data;
      if (fileToUpload) {
        await uploadFileMutation.mutateAsync({ id: createdReport.id, file: fileToUpload });
        message.success('Lab izveštaj je kreiran sa fajlom!');
      } else {
        message.success('Lab izveštaj je kreiran!');
      }
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri kreiranju!')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateLabReportRequest) => labReportsApi.update(labReport!.id, data),
    onSuccess: async () => {
      if (fileToUpload) {
        await uploadFileMutation.mutateAsync({ id: labReport!.id, file: fileToUpload });
        message.success('Lab izveštaj je izmenjen sa novim fajlom!');
      } else {
        message.success('Lab izveštaj je izmenjen!');
      }
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri izmeni!')),
  });

  const handleParsePdf = async (file: File) => {
    setIsParsing(true);
    try {
      const response = await labReportsApi.parsePdf(file);
      const result = response.data;

      const fieldsToSet: Record<string, unknown> = {};
      if (result.reportNumber) fieldsToSet.reportNumber = result.reportNumber;
      if (result.analysisType) fieldsToSet.analysisType = result.analysisType;
      if (result.laboratoryName) fieldsToSet.laboratoryName = result.laboratoryName;
      if (result.requestedAt) fieldsToSet.requestedAt = dayjs(result.requestedAt);
      if (result.completedAt) {
        fieldsToSet.completedAt = dayjs(result.completedAt);
        fieldsToSet.status = 'COMPLETED';
      }
      if (result.petId) fieldsToSet.petId = result.petId;
      if (result.vetId) fieldsToSet.vetId = result.vetId;

      if (petId) fieldsToSet.petId = petId;
      if (medicalRecordId) fieldsToSet.medicalRecordId = medicalRecordId;
      form.setFieldsValue(fieldsToSet);

      const messages: string[] = [];
      if (result.petName && !result.petId) {
        messages.push(`Ljubimac "${result.petName}" nije pronađen u bazi`);
      }
      if (result.vetName && !result.vetId) {
        messages.push(`Veterinar "${result.vetName}" nije pronađen u bazi`);
      }

      if (messages.length > 0) {
        message.info(messages.join('. ') + '. Izaberite ručno iz liste.');
      } else {
        message.success('Podaci su uspešno učitani iz PDF-a!');
      }
    } catch {
      message.error('Greška pri čitanju PDF-a!');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    console.log('Form values:', values);
    console.log('petId prop:', petId);
    const payload = {
      ...values,
      petId: values.petId ?? petId, // koristi prop ako forma nema vrednost
      medicalRecordId: (values.medicalRecordId as string) ?? medicalRecordId ?? null,
      requestedAt: (values.requestedAt as dayjs.Dayjs)?.format('YYYY-MM-DD'),
      completedAt: (values.completedAt as dayjs.Dayjs)?.format('YYYY-MM-DD') ?? undefined,
    };
    if (isEditing) {
      updateMutation.mutate(payload as UpdateLabReportRequest);
    } else {
      createMutation.mutate(payload as CreateLabReportRequest);
    }
  };

  const handleDownload = async () => {
    if (!labReport) return;
    try {
      const response = await labReportsApi.downloadFile(labReport.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch {
      message.error('Greška pri preuzimanju fajla!');
    }
  };

  const isLoading =
    createMutation.isPending || updateMutation.isPending || uploadFileMutation.isPending;

  const petOptions = petsData?.content.map((p) => ({ label: p.name, value: p.id })) ?? [];

  const vetOptions =
    usersData?.content.map((u) => ({
      label: `${u.firstName} ${u.lastName}`,
      value: u.id,
    })) ?? [];

  return (
    <Modal
      title={isEditing ? 'Izmeni lab izveštaj' : 'Novi lab izveštaj'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1000}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{ status: 'PENDING', isAbnormal: false }}
        style={{ marginTop: 16 }}
      >
        {/* === PDF Upload sekcija — NA VRHU === */}
        <Form.Item label='PDF fajl'>
          <Spin spinning={isParsing} tip='Čitanje podataka iz PDF-a...'>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isEditing && labReport?.fileName && !fileToUpload ? (
                <>
                  <FilePdfOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
                  <div style={{ flex: 1 }}>
                    <Text strong>{labReport.fileName}</Text>
                    <Text type='secondary' style={{ fontSize: 12, marginLeft: 8 }}>
                      {formatFileSize(labReport.fileSizeBytes)}
                    </Text>
                  </div>
                  <Space>
                    <Button size='small' icon={<DownloadOutlined />} onClick={handleDownload}>
                      Pregledaj
                    </Button>
                    <Button
                      size='small'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteFileMutation.mutate(labReport.id)}
                      loading={deleteFileMutation.isPending}
                    >
                      Obriši
                    </Button>
                  </Space>
                </>
              ) : fileToUpload ? (
                <>
                  <FilePdfOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
                  <div style={{ flex: 1 }}>
                    <Text strong>{fileToUpload.name}</Text>
                    <Text type='secondary' style={{ fontSize: 12, marginLeft: 8 }}>
                      {formatFileSize(fileToUpload.size)}
                    </Text>
                  </div>
                  <Space>
                    <Button
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        const url = URL.createObjectURL(fileToUpload);
                        window.open(url, '_blank');
                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                      }}
                    >
                      Pregledaj
                    </Button>
                    <Button
                      size='small'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setFileToUpload(null);
                        setFileList([]);
                      }}
                    >
                      Ukloni
                    </Button>
                  </Space>
                </>
              ) : (
                <>
                  <CloudUploadOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                  <div style={{ flex: 1 }}>
                    <Text type='secondary'>
                      {isEditing
                        ? 'Maks. 10MB, samo PDF'
                        : 'Podaci će biti automatski učitani iz PDF-a'}
                    </Text>
                  </div>
                </>
              )}
              <Upload
                accept='.pdf'
                maxCount={1}
                fileList={fileList}
                showUploadList={false}
                beforeUpload={(file) => {
                  if (file.type !== 'application/pdf') {
                    message.error('Samo PDF fajlovi su dozvoljeni!');
                    return Upload.LIST_IGNORE;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    message.error('Fajl je prevelik! Maksimum je 10MB.');
                    return Upload.LIST_IGNORE;
                  }
                  setFileToUpload(file);
                  setFileList([{ uid: '-1', name: file.name, status: 'done', size: file.size }]);
                  if (!isEditing) {
                    handleParsePdf(file);
                  }
                  return false;
                }}
              >
                <Button size='small' icon={<CloudUploadOutlined />}>
                  {fileToUpload || (isEditing && labReport?.fileName) ? 'Zameni' : 'Izaberi PDF'}
                </Button>
              </Upload>
            </div>
          </Spin>
        </Form.Item>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name='reportNumber'
              label='Broj izveštaja'
              rules={[{ required: true, message: 'Unesite broj izveštaja!' }]}
            >
              <Input placeholder='npr. LAB-2025-001' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='analysisType'
              label='Vrsta analize'
              rules={[{ required: true, message: 'Unesite vrstu analize!' }]}
            >
              <Input placeholder='npr. Opšti profil' />
            </Form.Item>
          </Col>
          {!petId && (
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
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          )}

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
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name='laboratoryName' label='Laboratorija'>
              <Input placeholder='Naziv laboratorije' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='status' label='Status'>
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name='requestedAt'
              label='Datum zahteva'
              rules={[{ required: true, message: 'Izaberite datum!' }]}
            >
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='completedAt' label='Datum završetka'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={9}>
            <Form.Item name='resultSummary' label='Rezime rezultata'>
              <TextArea rows={2} placeholder='Kratak opis rezultata analize...' />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name='notes' label='Napomene'>
              <TextArea rows={2} placeholder='Dodatne napomene...' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='isAbnormal' label='Nenormalni nalazi' valuePropName='checked'>
              <Switch checkedChildren='Da' unCheckedChildren='Ne' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj izveštaj'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
