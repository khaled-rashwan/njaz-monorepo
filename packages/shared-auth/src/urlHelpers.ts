/**
 * Get the dashboard URL based on environment
 */
export function getDashboardUrl(): string {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Production: use dashboard.njaz.org
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://dashboard.njaz.org';
        }
    }
    // Development: use localhost
    return 'http://localhost:3001';
}

/**
 * Get the landing URL based on environment
 */
export function getLandingUrl(): string {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Production: use njaz.org
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://njaz.org';
        }
    }
    // Development: use localhost
    return 'http://localhost:3000';
}
