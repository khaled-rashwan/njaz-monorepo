/**
 * Njaz Shared Backend
 * 
 * Re-exports for frontend apps to use.
 */

// Auth utilities
export {
    getUserGroups,
    hasAppAccess,
    getUserRole,
    isAdmin,
    isEngineer,
    getCurrentUserInfo,
    getAccessibleApps,
    APP_GROUPS,
    ROLE_GROUPS,
} from './auth-utils';

export type { AppGroup, RoleGroup } from './auth-utils';

// Schema types (generated after sandbox)
export type { Schema } from '../amplify/data/resource';
