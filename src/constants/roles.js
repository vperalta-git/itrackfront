/**
 * User Roles in I-Track System
 */
export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_AGENT: 'Sales Agent',
  DRIVER: 'Driver',
  SUPERVISOR: 'Supervisor',
  DISPATCH: 'Dispatch',
};

/**
 * Role-based permissions
 */
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    canManageUsers: true,
    canManageInventory: true,
    canManageAllocations: true,
    canViewAllData: true,
    canManageDispatch: true,
    canTrackDrivers: true,
  },
  [ROLES.MANAGER]: {
    canManageUsers: true,
    canManageInventory: true,
    canManageAllocations: true,
    canViewAllData: true,
    canManageDispatch: true,
    canTrackDrivers: true,
  },
  [ROLES.SALES_AGENT]: {
    canManageUsers: false,
    canManageInventory: false,
    canManageAllocations: false,
    canViewAllData: false,
    canManageDispatch: false,
    canTrackDrivers: false,
    canViewAssignedUnits: true,
  },
  [ROLES.DRIVER]: {
    canManageUsers: false,
    canManageInventory: false,
    canManageAllocations: false,
    canViewAllData: false,
    canManageDispatch: false,
    canTrackDrivers: false,
    canViewAssignments: true,
    canUpdateLocation: true,
  },
  [ROLES.DISPATCH]: {
    canManageUsers: false,
    canManageInventory: false,
    canManageAllocations: false,
    canViewAllData: false,
    canManageDispatch: true,
    canTrackDrivers: false,
  },
  [ROLES.SUPERVISOR]: {
    canManageUsers: false,
    canManageInventory: false,
    canManageAllocations: false,
    canViewAllData: true,
    canManageDispatch: false,
    canTrackDrivers: true,
  },
};

/**
 * Check if user has permission
 */
export const hasPermission = (userRole, permission) => {
  return PERMISSIONS[userRole]?.[permission] || false;
};

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
};
