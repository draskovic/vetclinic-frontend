import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  SettingOutlined,
  BankOutlined,
  TeamOutlined,
  SafetyOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

const adminSections = [
  {
    title: 'Vrste životinja',
    description: 'Upravljanje vrstama (pas, mačka, ptica...)',
    icon: <AppstoreOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    path: '/admin/species',
  },
  {
    title: 'Rase',
    description: 'Upravljanje rasama po vrstama',
    icon: <SettingOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    path: '/admin/breeds',
  },
  {
    title: 'Korisnici',
    description: 'Upravljanje korisnicima klinike',
    icon: <TeamOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    path: '/admin/users',
  },
  {
    title: 'Role',
    description: 'Upravljanje rolama i permisijama',
    icon: <SafetyOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
    path: '/admin/roles',
  },
  {
    title: 'Usluge',
    description: 'Cenovnik usluga klinike',
    icon: <MedicineBoxOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    path: '/admin/services',
  },
];

const superAdminSections = [
  {
    title: 'Klinike',
    description: 'Upravljanje klinikama i pretplatama',
    icon: <BankOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    path: '/admin/clinics',
  },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';

  const sections = isSuperAdmin ? [...adminSections, ...superAdminSections] : adminSections;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Administracija
      </Title>

      <Row gutter={[16, 16]}>
        {sections.map((section) => (
          <Col xs={24} sm={12} lg={6} key={section.path}>
            <Card
              hoverable
              onClick={() => navigate(section.path)}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ marginBottom: 12 }}>{section.icon}</div>
              <Title level={5} style={{ margin: 0 }}>
                {section.title}
              </Title>
              <Text type='secondary'>{section.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
