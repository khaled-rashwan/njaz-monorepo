import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

interface UseAdminDataOptions {
    url: string;
    method?: 'GET' | 'POST' | 'PATCH';
    body?: any;
    autoFetch?: boolean;
}

interface AdminUser {
    userId: string;
    username: string;
    email?: string;
    groups: string[];
    token: string;
}

/**
 * Hook to fetch data from admin API routes with auth.
 * Handles token retrieval, loading states, and error handling.
 */
export function useAdminData<T = any>({ url, method = 'GET', body, autoFetch = true }: UseAdminDataOptions) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (overrideBody?: any) => {
        setLoading(true);
        setError(null);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            if (!token) throw new Error('Not authenticated');

            const opts: RequestInit = {
                method: overrideBody ? 'PATCH' : method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            };

            if (overrideBody || body) {
                opts.body = JSON.stringify(overrideBody || body);
            }

            const resp = await fetch(url, opts);
            const result = await resp.json();

            if (!resp.ok) {
                throw new Error(result.error || result.message || 'Request failed');
            }

            setData(result);
            return result;
        } catch (err: any) {
            const msg = err.message || 'Unknown error';
            setError(msg);
            console.error(`❌ Admin API error (${url}):`, msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [url, method, body]);

    useEffect(() => {
        if (autoFetch) {
            fetchData();
        }
    }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

    return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to get the current admin user info (groups, token).
 */
export function useAdminUser() {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isDev, setIsDev] = useState(false);

    useEffect(() => {
        async function loadUser() {
            try {
                const currentUser = await getCurrentUser();
                const session = await fetchAuthSession();
                const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
                const token = session.tokens?.accessToken?.toString() || '';

                const adminUser: AdminUser = {
                    userId: currentUser.userId,
                    username: currentUser.username,
                    email: currentUser.signInDetails?.loginId,
                    groups,
                    token,
                };

                setUser(adminUser);
                setIsAdmin(groups.includes('admins'));
                setIsDev(groups.includes('devplatform-access') || groups.includes('engineers'));
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        loadUser();
    }, []);

    return { user, loading, isAdmin, isDev, hasAccess: isAdmin || isDev };
}
