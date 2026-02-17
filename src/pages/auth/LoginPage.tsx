import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Steps } from 'antd';
import { LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { clinicsApi } from '@/api/clinics';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types';
import type { Clinic } from '@/types';
import { theme } from 'antd';

const { Title } = Typography;

export default function LoginPage() {
  const [clinicForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);

  const handleClinicLookup = async (values: { clinicEmail: string }) => {
    setLoading(true);
    try {
      const response = await clinicsApi.lookup(values.clinicEmail);
      setClinic(response.data);
      setStep(1);
    } catch {
      message.error('Klinika nije pronađena! Proverite email adresu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: Omit<LoginRequest, 'clinicId'>) => {
    if (!clinic) return;
    setLoading(true);
    try {
      const response = await authApi.login({
        ...values,
        clinicId: clinic.id,
      });
      const { accessToken, refreshToken, user } = response.data;
      setAuth(user, accessToken, refreshToken, user.clinicId);
      message.success('Uspešno ste se prijavili!');
      navigate('/');
    } catch {
      message.error('Pogrešan email ili lozinka!');
    } finally {
      setLoading(false);
    }
  };

  const { token } = theme.useToken();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🐾</div>
          <Title level={2} style={{ margin: 0 }}>
            VetClinic
          </Title>
          <Typography.Text type='secondary'>Prijavite se na vaš nalog</Typography.Text>
        </div>

        <Steps
          current={step}
          items={[{ title: 'Klinika' }, { title: 'Prijava' }]}
          style={{ marginBottom: 32 }}
        />

        {step === 0 && (
          <Form form={clinicForm} onFinish={handleClinicLookup} layout='vertical' size='large'>
            <Form.Item
              name='clinicEmail'
              rules={[
                { required: true, message: 'Unesite email klinike!' },
                { type: 'email', message: 'Unesite ispravnu email adresu!' },
              ]}
            >
              <Input prefix={<BankOutlined />} placeholder='Email klinike (npr. info@klinika.rs)' />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={loading} block>
                Pronađi kliniku
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 1 && clinic && (
          <>
            <Card
              size='small'
              style={{
                marginBottom: 24,
                background: token.colorSuccessBg,
                borderColor: token.colorSuccessBorder,
              }}
            >
              <Typography.Text strong>🏥 {clinic.name}</Typography.Text>
              <br />
              <Typography.Text type='secondary'>
                {clinic.city}, {clinic.country}
              </Typography.Text>
            </Card>

            <Form form={loginForm} onFinish={handleLogin} layout='vertical' size='large'>
              <Form.Item
                name='email'
                rules={[
                  { required: true, message: 'Unesite email!' },
                  { type: 'email', message: 'Unesite ispravnu email adresu!' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder='Vaš email' />
              </Form.Item>

              <Form.Item name='password' rules={[{ required: true, message: 'Unesite lozinku!' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder='Lozinka' />
              </Form.Item>

              <Form.Item>
                <Button type='primary' htmlType='submit' loading={loading} block>
                  Prijavi se
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  block
                  onClick={() => {
                    setStep(0);
                    setClinic(null);
                  }}
                >
                  ← Nazad
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
