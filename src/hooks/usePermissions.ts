import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const { permissions, user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (permissions.includes('*')) return true;
    return perms.some((p) => permissions.includes(p));
  };

  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';

  return { hasPermission, hasAnyPermission, isSuperAdmin, permissions };
}
