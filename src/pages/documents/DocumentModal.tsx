import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Input,
  Row,
  Col,
  Upload,
  Space,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/api/documents';
import { petsApi } from '@/api/pets';
import type {
  DocumentRecord,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  FileType,
} from '@/types';
import type { UploadFile } from 'antd/es/upload/interface';
import { useAuthStore } from '@/store/authStore';

const { TextArea } = Input;
const { Text } = Typography;

const fileTypeOptions: { label: string; value: FileType }[] = [
  { label: 'PDF', value: 'PDF' },
  { label: 'Slika', value: 'IMAGE' },
  { label: 'Rendgen', value: 'XRAY' },
  { label: 'Lab nalaz', value: 'LAB_RESULT' },
  { label: 'Ostalo', value: 'OTHER' },
];

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType: string | null) => {
  if (mimeType?.startsWith('image/'))
    return <FileImageOutlined style={{ fontSize: 20, color: '#1890ff' }} />;
  if (mimeType === 'application/pdf')
    return <FilePdfOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />;
  return <FileOutlined style={{ fontSize: 20 }} />;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  return fallback;
};

interface DocumentModalProps {
  open: boolean;
  document: DocumentRecord | null;
  onClose: () => void;
  petId?: string;
  medicalRecordId?: string;
}

export default function DocumentModal({
  open,
  document,
  onClose,
  petId,
  medicalRecordId,
}: DocumentModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!document;

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { data: petsData } = useQuery({
    queryKey: ['pets-all'],
    queryFn: () => petsApi.getAll(0, 100).then((r) => r.data),
  });

  useEffect(() => {
    if (open) {
      if (document) {
        form.setFieldsValue({
          fileType: document.fileType,
          description: document.description,
          petId: document.petId,
        });
      } else {
        form.resetFields();
        if (petId) form.setFieldValue('petId', petId);
        if (medicalRecordId) form.setFieldValue('medicalRecordId', medicalRecordId);
      }
      setFileToUpload(null);
      setFileList([]);
    }
  }, [open, document, form, petId, medicalRecordId]);

  const uploadFileMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => documentsApi.uploadFile(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri upload-u fajla!')),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteFile(id),
    onSuccess: () => {
      message.success('Fajl je obrisan!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri brisanju fajla!')),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentsApi.create(data),
    onSuccess: async (response) => {
      const created = response.data;
      if (fileToUpload) {
        await uploadFileMutation.mutateAsync({ id: created.id, file: fileToUpload });
        message.success('Dokument je kreiran sa fajlom!');
      } else {
        message.success('Dokument je kreiran!');
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri kreiranju!')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDocumentRequest) => documentsApi.update(document!.id, data),
    onSuccess: async () => {
      if (fileToUpload) {
        await uploadFileMutation.mutateAsync({ id: document!.id, file: fileToUpload });
        message.success('Dokument je izmenjen sa novim fajlom!');
      } else {
        message.success('Dokument je izmenjen!');
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onClose();
    },
    onError: (error) => message.error(getErrorMessage(error, 'Greška pri izmeni!')),
  });

  const handleSubmit = (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      petId: values.petId ?? petId ?? null,
      medicalRecordId: (values.medicalRecordId as string) ?? medicalRecordId ?? null,
      uploadedBy: user?.id,
    };

    if (isEditing) {
      updateMutation.mutate(payload as UpdateDocumentRequest);
    } else {
      createMutation.mutate(payload as CreateDocumentRequest);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      const response = await documentsApi.downloadFile(document.id);
      const blob = new Blob([response.data], {
        type: document.mimeType ?? 'application/octet-stream',
      });
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

  return (
    <Modal
      title={isEditing ? 'Izmeni dokument' : 'Novi dokument'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={700}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{ fileType: 'PDF' }}
        style={{ marginTop: 16 }}
      >
        {/* === Fajl upload sekcija === */}
        <Form.Item label='Fajl'>
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
            {isEditing && document?.fileName && !fileToUpload ? (
              <>
                {getFileIcon(document.mimeType)}
                <div style={{ flex: 1 }}>
                  <Text strong>{document.fileName}</Text>
                  <Text type='secondary' style={{ fontSize: 12, marginLeft: 8 }}>
                    {formatFileSize(document.fileSizeBytes)}
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
                    onClick={() => deleteFileMutation.mutate(document.id)}
                    loading={deleteFileMutation.isPending}
                  >
                    Obriši
                  </Button>
                </Space>
              </>
            ) : fileToUpload ? (
              <>
                {getFileIcon(fileToUpload.type)}
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
                  <Text type='secondary'>PDF, JPEG, PNG, GIF, WEBP, BMP, TIFF — maks. 10MB</Text>
                </div>
              </>
            )}
            <Upload
              accept='.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif'
              maxCount={1}
              fileList={fileList}
              showUploadList={false}
              beforeUpload={(file) => {
                if (!allowedMimeTypes.includes(file.type)) {
                  message.error('Tip fajla nije dozvoljen! Dozvoljeni: PDF, slike.');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 10 * 1024 * 1024) {
                  message.error('Fajl je prevelik! Maksimum je 10MB.');
                  return Upload.LIST_IGNORE;
                }
                setFileToUpload(file);
                setFileList([{ uid: '-1', name: file.name, status: 'done', size: file.size }]);

                // Auto-detect fileType
                if (file.type === 'application/pdf') {
                  form.setFieldValue('fileType', 'PDF');
                } else if (file.type.startsWith('image/')) {
                  form.setFieldValue('fileType', 'IMAGE');
                }

                return false;
              }}
            >
              <Button size='small' icon={<CloudUploadOutlined />}>
                {fileToUpload || (isEditing && document?.fileName) ? 'Zameni' : 'Izaberi fajl'}
              </Button>
            </Upload>
          </div>
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name='fileType'
              label='Tip dokumenta'
              rules={[{ required: true, message: 'Izaberite tip!' }]}
            >
              <Select options={fileTypeOptions} />
            </Form.Item>
          </Col>
          {!petId && (
            <Col span={8}>
              <Form.Item name='petId' label='Ljubimac'>
                <Select
                  placeholder='Izaberite ljubimca...'
                  options={petOptions}
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Form.Item name='description' label='Opis'>
          <TextArea rows={3} placeholder='Opis dokumenta...' />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Otkaži
          </Button>
          <Button type='primary' htmlType='submit' loading={isLoading}>
            {isEditing ? 'Sačuvaj izmene' : 'Kreiraj dokument'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
