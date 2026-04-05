import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from './cookieStorage';
import Cookies from 'js-cookie';

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

        // If on test subdomain, use .test.njaz.org to isolate cookies
        if (hostname.includes('test.njaz.org')) {
            return '.test.njaz.org';
        }

        // Production: use .njaz.org for cookie sharing
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return '.njaz.org';
        }
    }

    // Development: use current domain (no sharing)
    return '';
}

/**
 * Configure Amplify with cookie-based storage for cross-subdomain auth
 * 
 * Uses SameSite=None with Secure=true to enable cross-subdomain cookie sharing
 * in modern browsers. This is required for desktop browsers which have strict
 * third-party cookie policies.
 */
export function configureAmplifyAuth(config: any) {
    const cookieDomain = getAuthDomain();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    // Support for shared backend across separate Amplify Apps
    // You can set these in the Amplify Console to force apps to share one backend
    const overridenConfig = { ...config };
    if (process.env.NEXT_PUBLIC_USER_POOL_ID) {
        overridenConfig.auth.user_pool_id = process.env.NEXT_PUBLIC_USER_POOL_ID;
    }
    if (process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
        overridenConfig.auth.user_pool_client_id = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
    }

    // Determine if we're in production
    let isProduction = process.env.NODE_ENV === 'production' || hostname.endsWith('.njaz.org') || hostname === 'njaz.org' || hostname.includes('test.njaz.org');

    // Debug: Log all available cookies on page load
    if (typeof window !== 'undefined') {
        const allCookies = Cookies.get();
        const cognitoCookies = Object.keys(allCookies).filter(k => k.includes('Cognito'));
        
        // CLEANUP: If we're on test and find non-prefixed cookies, clear them to avoid 18-cookie mess
        if (hostname.includes('test.njaz.org')) {
            cognitoCookies.forEach(key => {
                if (!key.startsWith('test-')) {
                    console.warn(`🧹 Clearing stale non-prefixed cookie: ${key}`);
                    Cookies.remove(key, { path: '/', domain: '.njaz.org' });
                    Cookies.remove(key, { path: '/', domain: '.test.njaz.org' });
                    Cookies.remove(key, { path: '/' });
                }
            });
        }

        console.log('🍪 Available cookies on page load:', {
            total: Object.keys(allCookies).length,
            cognitoRelated: cognitoCookies.length,
            cognitoKeys: cognitoCookies.map(k => k.substring(0, 40) + '...'),
            hostname: window.location.hostname,
        });
    }

    // Create cookie storage instance with proper cross-subdomain settings
    const cookieStorage = new CookieStorage({
        domain: cookieDomain,
        secure: true, // Always true - required for SameSite=None
        sameSite: isProduction ? 'none' : 'lax', // 'none' for production cross-subdomain
    });

    // Configure Amplify with the resource config
    Amplify.configure(overridenConfig, {
        ssr: false,
    });

    // Set cookie storage for Cognito tokens
    cognitoUserPoolsTokenProvider.setKeyValueStorage(cookieStorage);

    const userPoolClientId = overridenConfig?.auth?.user_pool_client_id || 'UNKNOWN';

    console.log('✅ Amplify configured with cookie storage', {
        domain: cookieDomain || 'current domain',
        userPoolClientId,
        isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        secure: true,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
    });
}

