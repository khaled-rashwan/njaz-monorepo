import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from './cookieStorage';

/**
 * Get the appropriate cookie domain based on environment
 */
export function getAuthDomain(): string {
    // Check if we're in production
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
 */
export function configureAmplifyAuth(config: any) {
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || getAuthDomain();

    // Create cookie storage instance
    const cookieStorage = new CookieStorage({
        domain: cookieDomain,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    // Configure Amplify with the resource config
    Amplify.configure(config);

    // Set cookie storage for Cognito tokens
    cognitoUserPoolsTokenProvider.setKeyValueStorage(cookieStorage);

    console.log('✅ Amplify configured with cookie storage', {
        domain: cookieDomain || 'current domain',
        environment: process.env.NODE_ENV,
    });
}
