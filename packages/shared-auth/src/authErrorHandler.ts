import { signOut } from 'aws-amplify/auth';
import Cookies from 'js-cookie';

/**
 * Clear all Cognito auth cookies and sign out
 * This is used when tokens are revoked or invalid
 */
export async function clearAuthAndSignOut(): Promise<void> {
    console.log('🧹 Clearing auth tokens and signing out...');

    // Clear all Cognito cookies
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach((key) => {
        if (key.includes('CognitoIdentityServiceProvider')) {
            // Remove with various domain configurations
            Cookies.remove(key);
            Cookies.remove(key, { path: '/' });
            Cookies.remove(key, { path: '/', domain: '.njaz.org' });
            console.log(`🗑️ Removed cookie: ${key.substring(0, 40)}...`);
        }
    });

    // Try to sign out via Amplify (may fail if tokens already invalid)
    try {
        await signOut({ global: true });
        console.log('✅ Signed out successfully');
    } catch (error) {
        console.log('ℹ️ Sign out skipped (tokens already invalid)');
    }
}

/**
 * Handle auth errors - if token is revoked, clear everything
 */
export function handleAuthError(error: any): boolean {
    const message = error?.message || error?.toString() || '';
    const errorType = error?.__type || error?.name || '';

    // Check for token revocation or expiry errors
    const isTokenRevoked =
        message.includes('Refresh Token has been revoked') ||
        message.includes('Token has been revoked') ||
        errorType === 'NotAuthorizedException';

    if (isTokenRevoked) {
        console.warn('⚠️ Auth token revoked - clearing stale tokens');
        clearAuthAndSignOut();
        return true;
    }

    return false;
}
