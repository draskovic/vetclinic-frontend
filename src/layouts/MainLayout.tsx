import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme, Button } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  HeartOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  InboxOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useThemeStore } from '@/store/themeStore';
import { ExperimentOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const allMenuItems = [
  {
    key: '/',
    icon: <DashboardOutlined style={{ color: '#1890ff' }} />,
    label: 'Dashboard',
    permission: null,
  },
  {
    key: '/owners',
    icon: <TeamOutlined style={{ color: '#722ed1' }} />,
    label: 'Vlasnici',
    permission: 'manage_owners',
  },
  {
    key: '/pets',
    icon: <HeartOutlined style={{ color: '#eb2f96' }} />,
    label: 'Ljubimci',
    permission: 'manage_pets',
  },
  {
    key: '/appointments',
    icon: <CalendarOutlined style={{ color: '#fa8c16' }} />,
    label: 'Termini',
    permission: 'manage_appointments',
  },
  {
    key: '/medical-records',
    icon: <FileTextOutlined style={{ color: '#13c2c2' }} />,
    label: 'Intervencije',
    permission: 'manage_medical_records',
  },
  {
    key: '/vaccinations',
    icon: <MedicineBoxOutlined style={{ color: '#52c41a' }} />,
    label: 'Vakcinacije',
    permission: 'manage_vaccinations',
  },
  {
    key: '/lab-reports',
    icon: <ExperimentOutlined style={{ color: '#13c2c2' }} />,
    label: 'Lab izveštaji',
    permission: 'manage_medical_records',
  },

  {
    key: '/invoices',
    icon: <DollarOutlined style={{ color: '#faad14' }} />,
    label: 'Fakture',
    permission: 'manage_invoices',
  },
  {
    key: '/inventory',
    icon: <InboxOutlined style={{ color: '#2f54eb' }} />,
    label: 'Inventar',
    permission: 'manage_inventory',
  },
  {
    key: '/admin',
    icon: <SettingOutlined style={{ color: '#8c8c8c' }} />,
    label: 'Administracija',
    permission: 'admin',
  },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { token } = theme.useToken();

  const { hasPermission } = usePermissions();

  const menuItems = allMenuItems.filter((item) => {
    if (item.permission === null) return true;
    if (item.permission === 'admin') return hasPermission('*');
    return hasPermission(item.permission);
  });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Odjavi se',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const { darkMode, toggleTheme } = useThemeStore();
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {collapsed ? '🐾' : <strong>🐾 VetClinic</strong>}
        </div>

        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8, fontSize: 16 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: token.colorText,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type='text'
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{ fontSize: 18 }}
            />
            <Dropdown menu={{ items: userMenuItems }} placement='bottomRight'>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                <span>
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
