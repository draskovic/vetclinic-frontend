import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Descriptions,
  Tag,
  Row,
  Col,
  Spin,
  Switch,
  Upload,
  Image,
  Popconfirm,
  Space,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicsApi } from '@/api';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import type { UpdateClinicRequest } from '@/types';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';

const ClinicSettingsPage = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const clinicId = useAuthStore((s) => s.clinicId);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      const res = await clinicsApi.getById(clinicId!);
      return res.data;
    },
    enabled: !!clinicId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateClinicRequest) => clinicsApi.update(clinicId!, data),
    onSuccess: () => {
      message.success('Podešavanja klinike su sačuvana');
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri čuvanju podešavanja');
    },
  });

  useEffect(() => {
    if (!clinicId || !clinic?.logoUrl) {
      setLogoPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    apiClient
      .get(`/clinics/${clinicId}/logo`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setLogoPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoPreviewUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clinicId, clinic?.logoUrl]);

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => clinicsApi.uploadLogo(clinicId!, file),
    onSuccess: () => {
      message.success('Logo je sačuvan');
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri upload-u logoa');
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => clinicsApi.deleteLogo(clinicId!),
    onSuccess: () => {
      message.success('Logo je uklonjen');
      setLogoPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri uklanjanju logoa');
    },
  });

  const handleLogoUpload = (file: File) => {
    // Validacija na frontendu (backend takođe validira)
    if (!file.type.startsWith('image/')) {
      message.error('Logo mora biti slika');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Logo ne sme biti veći od 2MB');
      return false;
    }
    uploadLogoMutation.mutate(file);
    return false; // sprečava default upload ponašanje Ant Design-a
  };

  const handleSubmit = (values: any) => {
    const payload: UpdateClinicRequest = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country || undefined,
      taxId: values.taxId || undefined,
      registrationNumber: values.registrationNumber || undefined,
      activityCode: values.activityCode || undefined,
      bankAccount: values.bankAccount || undefined,
      vatPayer: values.vatPayer ?? false,
      veterinaryLicenseNumber: values.veterinaryLicenseNumber || undefined,
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) return <Spin size='large' style={{ display: 'block', margin: '100px auto' }} />;

  const planColors: Record<string, string> = {
    BASIC: 'default',
    STANDARD: 'blue',
    PREMIUM: 'gold',
  };

  return (
    <div>
      <h2>Podešavanja klinike</h2>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title='Informacije o pretplati' bordered column={1}>
          <Descriptions.Item label='Plan pretplate'>
            <Tag color={planColors[clinic?.subscriptionPlan || 'BASIC']}>
              {clinic?.subscriptionPlan || 'BASIC'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label='Datum isteka'>
            {clinic?.subscriptionExpiresAt
              ? new Date(clinic.subscriptionExpiresAt).toLocaleDateString('sr-Latn-RS')
              : 'Neograničeno'}
          </Descriptions.Item>
          <Descriptions.Item label='Status'>
            <Tag color={clinic?.active ? 'green' : 'red'}>
              {clinic?.active ? 'Aktivna' : 'Neaktivna'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title='Logo klinike' style={{ marginBottom: 24 }}>
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {logoPreviewUrl ? (
            <div
              style={{
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                textAlign: 'center',
                maxWidth: 400,
              }}
            >
              <Image
                src={logoPreviewUrl}
                alt='Logo klinike'
                style={{ maxHeight: 100, maxWidth: 350 }}
                preview={false}
              />
            </div>
          ) : (
            <div
              style={{
                padding: 24,
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: 8,
                textAlign: 'center',
                color: '#999',
                maxWidth: 400,
              }}
            >
              Logo nije postavljen
            </div>
          )}

          <Space>
            <Upload
              accept='image/png,image/jpeg,image/gif,image/webp'
              beforeUpload={handleLogoUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploadLogoMutation.isPending}>
                {logoPreviewUrl ? 'Promeni logo' : 'Postavi logo'}
              </Button>
            </Upload>

            {logoPreviewUrl && (
              <Popconfirm
                title='Ukloniti logo?'
                description='Logo će biti uklonjen sa svih dokumenata'
                onConfirm={() => deleteLogoMutation.mutate()}
                okText='Ukloni'
                cancelText='Otkaži'
              >
                <Button danger icon={<DeleteOutlined />} loading={deleteLogoMutation.isPending}>
                  Ukloni logo
                </Button>
              </Popconfirm>
            )}
          </Space>

          <div style={{ fontSize: 12, color: '#999' }}>
            Preporučeno: horizontalni logo u PNG formatu, max 2MB. Logo će se pojaviti u zaglavlju
            svih PDF dokumenata (recepti, fakture, kartoni, vakcinacioni list).
          </div>
        </Space>
      </Card>

      <Card title='Podaci o klinici'>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{
            name: clinic?.name || '',
            email: clinic?.email || '',
            phone: clinic?.phone || '',
            address: clinic?.address || '',
            city: clinic?.city || '',
            country: clinic?.country || '',
            taxId: clinic?.taxId || '',
            registrationNumber: clinic?.registrationNumber || '',
            activityCode: clinic?.activityCode || '',
            bankAccount: clinic?.bankAccount || '',
            vatPayer: clinic?.vatPayer ?? false,
            veterinaryLicenseNumber: clinic?.veterinaryLicenseNumber || '',
          }}
        >
          <Form.Item
            name='name'
            label='Naziv klinike'
            rules={[{ required: true, message: 'Naziv je obavezan' }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='email' label='Email'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='phone' label='Telefon'>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='address' label='Adresa'>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='city' label='Grad'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='country' label='Država'>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='taxId' label='PIB'>
                <Input placeholder='npr. 123456789' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='registrationNumber' label='Matični broj'>
                <Input placeholder='npr. 12345678' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='activityCode' label='Šifra delatnosti'>
                <Input placeholder='npr. 7500' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='veterinaryLicenseNumber' label='Broj veterinarske licence'>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='bankAccount' label='Tekući račun'>
            <Input placeholder='npr. 160-0000000000000-00' />
          </Form.Item>

          <Form.Item name='vatPayer' label='Obveznik PDV-a' valuePropName='checked'>
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={updateMutation.isPending}>
              Sačuvaj izmene
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ClinicSettingsPage;
