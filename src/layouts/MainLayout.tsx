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
  FolderOutlined,
  AuditOutlined,
  MenuUnfoldOutlined,
  FileSearchOutlined,
  SolutionOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeStore } from '@/store/themeStore';
import { ExperimentOutlined, SearchOutlined } from '@ant-design/icons';
import NotificationBell from '../components/NotificationBell';
import CommandPalette from '../components/CommandPalette';

const { Header, Sider, Content } = Layout;

const allMenuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined style={{ color: '#1890ff' }} />,
    label: 'Dashboard',
    permission: null,
  },
  {
    key: 'patients',
    icon: <TeamOutlined style={{ color: '#722ed1' }} />,
    label: 'Pacijenti',
    permission: 'manage_owners',
    children: [
      {
        key: '/owners',
        icon: <TeamOutlined style={{ color: '#722ed1' }} />,
        label: 'Vlasnici',
      },
      {
        key: '/pets',
        icon: <HeartOutlined style={{ color: '#eb2f96' }} />,
        label: 'Ljubimci',
      },
    ],
  },
  {
    key: 'scheduling',
    icon: <CalendarOutlined style={{ color: '#fa8c16' }} />,
    label: 'Zakazivanje',
    permission: 'manage_appointments',
    children: [
      {
        key: '/appointments',
        icon: <CalendarOutlined style={{ color: '#fa8c16' }} />,
        label: 'Termini',
      },
      {
        key: '/calendar',
        icon: <CalendarOutlined style={{ color: '#13c2c2' }} />,
        label: 'Kalendar',
      },
    ],
  },
  {
    key: 'medical',
    icon: <FileTextOutlined style={{ color: '#13c2c2' }} />,
    label: 'Med. kartoni',
    permission: 'manage_medical_records',
    children: [
      {
        key: '/medical-records',
        icon: <FileTextOutlined style={{ color: '#13c2c2' }} />,
        label: 'Intervencije',
      },
      {
        key: '/vaccinations',
        icon: <MedicineBoxOutlined style={{ color: '#52c41a' }} />,
        label: 'Vakcinacije',
      },
      {
        key: '/lab-reports',
        icon: <ExperimentOutlined style={{ color: '#13c2c2' }} />,
        label: 'Lab izveštaji',
      },
      {
        key: '/documents',
        icon: <FolderOutlined style={{ color: '#597ef7' }} />,
        label: 'Dokumenti',
      },
    ],
  },
  {
    key: 'finance',
    icon: <DollarOutlined style={{ color: '#faad14' }} />,
    label: 'Finansije',
    permission: 'manage_invoices',
    children: [
      {
        key: '/invoices',
        icon: <DollarOutlined style={{ color: '#faad14' }} />,
        label: 'Fakture',
      },
      {
        key: '/inventory',
        icon: <InboxOutlined style={{ color: '#2f54eb' }} />,
        label: 'Inventar',
      },
    ],
  },
  {
    key: '/admin',
    icon: <SettingOutlined style={{ color: '#8c8c8c' }} />,
    label: 'Administracija',
    permission: 'admin',
    children: [
      {
        key: '/admin',
        icon: <SettingOutlined style={{ color: '#8c8c8c' }} />,
        label: 'Podešavanja',
      },
      {
        key: '/audit-logs',
        icon: <AuditOutlined style={{ color: '#8c8c8c' }} />,
        label: 'Audit logovi',
      },
      {
        key: '/admin/diagnoses',
        icon: <FileSearchOutlined style={{ color: '#8c8c8c' }} />,
        label: 'Dijagnoze',
      },
      {
        key: '/admin/protocols',
        icon: <SolutionOutlined style={{ color: '#8c8c8c' }} />,
        label: 'Protokoli',
      },
    ],
  },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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
      onClick: () => navigate('/profile'),
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

        <div
          className='sidebar-menu-scroll'
          style={{ overflow: 'auto', height: 'calc(100vh - 64px)' }}
        >
          <Menu
            mode='inline'
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['patients', 'scheduling', 'medical', 'finance', '/admin']}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, marginTop: 8, fontSize: 16 }}
          />
        </div>
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
              icon={<SearchOutlined />}
              onClick={() => setPaletteOpen(true)}
              style={{
                fontSize: 13,
                color: token.colorTextSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 6,
                padding: '4px 12px',
              }}
            >
              Pretraži
              <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>Ctrl+K</span>
            </Button>

            <NotificationBell />
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
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </Layout>
  );
}
