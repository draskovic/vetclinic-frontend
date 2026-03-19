import { Card, Form, Input, Button, message, Descriptions, Tag, Row, Col, Spin } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import type { UpdateClinicRequest } from '@/types';

const ClinicSettingsPage = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const clinicId = useAuthStore((s) => s.clinicId);

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

  const handleSubmit = (values: any) => {
    const payload: UpdateClinicRequest = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country || undefined,
      taxId: values.taxId || undefined,
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

          <Form.Item name='taxId' label='PIB'>
            <Input />
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
