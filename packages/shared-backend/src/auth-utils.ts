/**
 * Njaz Auth Utilities
 * 
 * Helper functions for working with Cognito authentication
 * and group-based access control.
 */

import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

// App access group names
export const APP_GROUPS = {
    ESTEBIAN: 'estebian-access',
    PID: 'pid-access',
    DEV_PLATFORM: 'devplatform-access',
    INTERIOR: 'interior-access',
} as const;

// Role group names
export const ROLE_GROUPS = {
    ADMINS: 'admins',
    ENGINEERS: 'engineers',
    USERS: 'users',
    VIEWERS: 'viewers',
} as const;

export type AppGroup = typeof APP_GROUPS[keyof typeof APP_GROUPS];
export type RoleGroup = typeof ROLE_GROUPS[keyof typeof ROLE_GROUPS];

/**
 * Get the current user's Cognito groups
 */
export async function getUserGroups(): Promise<string[]> {
    try {
        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload['cognito:groups'];
        return (groups as string[]) || [];
    } catch (error) {
        console.error('Error fetching user groups:', error);
        return [];
    }
}

/**
 * Check if user has access to a specific app
 */
export async function hasAppAccess(appGroup: AppGroup): Promise<boolean> {
    const groups = await getUserGroups();
    return groups.includes(appGroup) || groups.includes(ROLE_GROUPS.ADMINS);
}

/**
 * Get the user's role (highest privilege level)
 */
export async function getUserRole(): Promise<RoleGroup> {
    const groups = await getUserGroups();

    if (groups.includes(ROLE_GROUPS.ADMINS)) return ROLE_GROUPS.ADMINS;
    if (groups.includes(ROLE_GROUPS.ENGINEERS)) return ROLE_GROUPS.ENGINEERS;
    if (groups.includes(ROLE_GROUPS.USERS)) return ROLE_GROUPS.USERS;
    return ROLE_GROUPS.VIEWERS;
}

/**
 * Check if user is an admin
 */
export async function isAdmin(): Promise<boolean> {
    const groups = await getUserGroups();
    return groups.includes(ROLE_GROUPS.ADMINS);
}

/**
 * Check if user is an engineer
 */
export async function isEngineer(): Promise<boolean> {
    const groups = await getUserGroups();
    return groups.includes(ROLE_GROUPS.ENGINEERS) || groups.includes(ROLE_GROUPS.ADMINS);
}

/**
 * Get current user info
 */
export async function getCurrentUserInfo() {
    try {
        const user = await getCurrentUser();
        const groups = await getUserGroups();
        const role = await getUserRole();

        return {
            userId: user.userId,
            username: user.username,
            groups,
            role,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Get all apps the user has access to
 */
export async function getAccessibleApps(): Promise<AppGroup[]> {
    const groups = await getUserGroups();
    const isAdminUser = groups.includes(ROLE_GROUPS.ADMINS);

    if (isAdminUser) {
        return Object.values(APP_GROUPS);
    }

    return Object.values(APP_GROUPS).filter((appGroup) =>
        groups.includes(appGroup)
    );
}
