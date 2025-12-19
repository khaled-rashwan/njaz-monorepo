/**
 * Get the dashboard URL based on environment
 * Uses environment variable for SSR compatibility
 */
export function getDashboardUrl(): string {
    // Check environment variable first (works in SSR and client)
    if (process.env.NEXT_PUBLIC_DASHBOARD_URL) {
        return process.env.NEXT_PUBLIC_DASHBOARD_URL;
    }

    // Fallback: Check hostname on client
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Production: use dashboard.njaz.org
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://dashboard.njaz.org';
        }
    }

    // Default for development
    return 'http://localhost:3001';
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
