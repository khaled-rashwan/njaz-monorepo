/**
 * Get the dashboard URL based on environment
 * @param redirectPath Optional path to redirect back to after login
 */
export function getDashboardUrl(redirectPath?: string): string {
    let baseUrl = '';

    // Check environment variable first (works in SSR and client)
    if (process.env.NEXT_PUBLIC_DASHBOARD_URL) {
        baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL;
    } else if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Production: use dashboard.njaz.org
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            baseUrl = 'https://dashboard.njaz.org';
        } else {
            baseUrl = 'http://localhost:3001';
        }
    } else {
        baseUrl = 'http://localhost:3001';
    }

    if (redirectPath) {
        const encodedRedirect = encodeURIComponent(redirectPath);
        return `${baseUrl}?redirect_url=${encodedRedirect}`;
    }

    return baseUrl;
}

/**
 * Get current URL for redirection purposes
 */
export function getCurrentUrl(): string {
    if (typeof window !== 'undefined') {
        return window.location.href;
    }
    return '';
}

/**
 * Get the landing URL based on environment
 * Uses environment variable for SSR compatibility
 */
export function getLandingUrl(): string {
    // Check environment variable first (works in SSR and client)
    if (process.env.NEXT_PUBLIC_LANDING_URL) {
        return process.env.NEXT_PUBLIC_LANDING_URL;
    }

    // Fallback: Check hostname on client
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Production: use njaz.org
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://njaz.org';
        }
    }

    // Default for development
    return 'http://localhost:3000';
}
/**
 * Get the URL for a specific app based on environment
 */
export function getAppUrl(appId: string): string | null {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    const PROD_URLS: Record<string, string> = {
        'dashboard': 'https://dashboard.njaz.org',
        'estebian': 'https://estebian.njaz.org',
        'landing': 'https://njaz.org',
        'dev': 'https://dev.njaz.org',
        'process': 'https://process.njaz.org',
    };

    const LOCAL_URLS: Record<string, string> = {
        'dashboard': 'http://localhost:3001',
        'estebian': 'http://localhost:3002',
        'landing': 'http://localhost:3000',
        'dev': 'http://localhost:3003', // Assuming 3003
        'process': 'http://localhost:3004', // Assuming 3004
    };

    if (isLocal) {
        return LOCAL_URLS[appId] || null;
    }

    return PROD_URLS[appId] || null;
}
