import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from './cookieStorage';

/**
 * Get the appropriate cookie domain based on environment
 * This runs on the client side after hydration
 */
export function getAuthDomain(): string {
    // First check environment variable (highest priority)
    if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
        return process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    }

    // Check if we're in browser
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Production: use .njaz.org for cookie sharing
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return '.njaz.org';
        }
    }

    // Development: use current domain (no sharing)
    return '';
}

/**
 * Configure Amplify with cookie-based storage for cross-domain auth
 * IMPORTANT: This must be called on the client side in a useEffect
 */
export function configureAmplifyAuth(config: any) {
    const cookieDomain = getAuthDomain();

    // Determine if we're in production
    // Check hostname if window exists, otherwise use NODE_ENV
    let isProduction = process.env.NODE_ENV === 'production';
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        isProduction = hostname.endsWith('.njaz.org') || hostname === 'njaz.org';
    }

    // Create cookie storage instance
    const cookieStorage = new CookieStorage({
        domain: cookieDomain,
        secure: isProduction,
        sameSite: 'lax',
    });

    // Configure Amplify with the resource config
    Amplify.configure(config);

    // Set cookie storage for Cognito tokens
    cognitoUserPoolsTokenProvider.setKeyValueStorage(cookieStorage);

    console.log('✅ Amplify configured with cookie storage', {
        domain: cookieDomain || 'current domain',
        isProduction,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
    });
}
