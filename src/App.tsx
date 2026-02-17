import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import srRS from 'antd/locale/sr_RS';
import MainLayout from '@/layouts/MainLayout';
import LoginPage from '@/pages/auth/LoginPage';
import Dashboard from '@/pages/Dashboard';
import ProtectedRoute from '@/components/ProtectedRoute';
import OwnersPage from '@/pages/owners/OwnersPage';
import AdminPage from '@/pages/admin/AdminPage';
import SpeciesPage from '@/pages/admin/SpeciesPage';
import BreedPage from '@/pages/admin/BreedPage';
import PetsPage from '@/pages/pets/PetsPage';
import AppointmentsPage from '@/pages/appointments/AppointmentsPage';
import MedicalRecordsPage from '@/pages/medical-records/MedicalRecordsPage';
import ClinicsPage from '@/pages/admin/ClinicsPage';
import VaccinationsPage from '@/pages/vaccinations/VaccinationsPage';
import UsersPage from '@/pages/admin/UsersPage';
import RolesPage from '@/pages/admin/RolesPage';
import PermissionGuard from '@/components/PermissionGuard';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import InventoryPage from './pages/inventory/InventoryPage';
import InventoryTransactionsPage from './pages/inventory/InventoryTransactionsPage';
import ServicesPage from '@/pages/admin/ServicesPage';
import { useThemeStore } from '@/store/themeStore';
import LabReportsPage from '@/pages/lab-reports/LabReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  const { darkMode } = useThemeStore();

  return (
    <div className={darkMode ? 'dark-theme' : 'light-theme'}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: darkMode
              ? {
                  colorBgContainer: '#1e2433',
                  colorBgElevated: '#252d3d',
                  colorBgLayout: '#161b26',
                  colorBorderSecondary: '#2d3548',
                }
              : {
                  colorBgContainer: '#edf0f5',
                  colorBgElevated: '#f5f6fa',
                  colorBgLayout: '#e2e6ee',
                  colorBorderSecondary: '#d0d5df',
                },
          }}
          locale={srRS}
        >
          <AntApp>
            <BrowserRouter>
              <Routes>
                <Route path='/login' element={<LoginPage />} />
                <Route
                  path='/'
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />

                  <Route
                    path='owners'
                    element={
                      <PermissionGuard permission='manage_owners'>
                        <OwnersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='pets'
                    element={
                      <PermissionGuard permission='manage_pets'>
                        <PetsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='appointments'
                    element={
                      <PermissionGuard permission='manage_appointments'>
                        <AppointmentsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='medical-records'
                    element={
                      <PermissionGuard permission='manage_medical_records'>
                        <MedicalRecordsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='vaccinations'
                    element={
                      <PermissionGuard permission='manage_vaccinations'>
                        <VaccinationsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='lab-reports'
                    element={
                      <PermissionGuard permission='manage_medical_records'>
                        <LabReportsPage />
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path='invoices'
                    element={
                      <PermissionGuard permission='manage_invoices'>
                        <InvoicesPage />
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path='/inventory'
                    element={
                      <PermissionGuard permission='manage_inventory'>
                        <InventoryPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='/inventory-transactions'
                    element={
                      <PermissionGuard permission='manage_inventory'>
                        <InventoryTransactionsPage />
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path='admin'
                    element={
                      <PermissionGuard permission='*'>
                        <AdminPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='admin/species'
                    element={
                      <PermissionGuard permission='*'>
                        <SpeciesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='admin/breeds'
                    element={
                      <PermissionGuard permission='*'>
                        <BreedPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='admin/users'
                    element={
                      <PermissionGuard permission='*'>
                        <UsersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='admin/roles'
                    element={
                      <PermissionGuard permission='*'>
                        <RolesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path='admin/services'
                    element={
                      <PermissionGuard permission='*'>
                        <ServicesPage />
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path='admin/clinics'
                    element={
                      <PermissionGuard permission='*'>
                        <ClinicsPage />
                      </PermissionGuard>
                    }
                  />
                </Route>
                <Route path='*' element={<Navigate to='/' replace />} />
              </Routes>
            </BrowserRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </div>
  );
}
