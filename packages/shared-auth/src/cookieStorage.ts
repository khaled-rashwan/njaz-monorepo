import Cookies from 'js-cookie';
import { KeyValueStorageInterface } from 'aws-amplify/utils';

/**
 * Cookie-based storage adapter for AWS Amplify
 * Enables cross-subdomain authentication by storing tokens in cookies
 */
export class CookieStorage implements KeyValueStorageInterface {
    private domain: string;
    private secure: boolean;
    private sameSite: 'strict' | 'lax' | 'none';
    private prefix: string;

    constructor(options: {
        domain?: string;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
    } = {}) {
        this.domain = options.domain || '';
        this.secure = options.secure ?? true;
        this.sameSite = options.sameSite || 'lax';
        
        // Isolate test cookies with a prefix to prevent collision with production
        this.prefix = this.domain.includes('test.njaz.org') ? 'test-' : '';
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            const saltedKey = this.prefix + key;
            const cookieOptions: Cookies.CookieAttributes = {
                expires: 365, // 1 year
                secure: this.secure,
                sameSite: this.sameSite,
                path: '/', // Ensure cookie is accessible across all paths
            };

            // Only set domain in production (not localhost)
            if (this.domain && !this.domain.includes('localhost')) {
                cookieOptions.domain = this.domain;
            }

            Cookies.set(saltedKey, value, cookieOptions);

            // Debug logging
            if (this.domain) {
                console.log(`🍪 Set cookie: ${saltedKey.substring(0, 30)}... with domain: ${this.domain}`);
            }
        } catch (error) {
            console.error('Error setting cookie:', error);
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const saltedKey = this.prefix + key;
            const value = Cookies.get(saltedKey) || null;

            // Debug logging for auth tokens
            if (key.includes('CognitoIdentityServiceProvider')) {
                if (value) {
                    console.log(`✅ Cookie FOUND: ${saltedKey.substring(0, 50)}...`);
                } else {
                    const allCookies = Cookies.get();
                    const cognitoKeys = Object.keys(allCookies).filter(k => k.includes('Cognito'));
                    console.warn(`❌ Cookie NOT FOUND: ${saltedKey.substring(0, 50)}...`);
                    console.warn(`ℹ️ Available Cognito keys in browser:`, cognitoKeys);
                    
                    // Check for Client ID mismatch
                    const expectedClientId = key.split('.')[1];
                    const allClientIds = cognitoKeys.map(k => k.split('.')[1]).filter(Boolean);
                    // Filter unique IDs in a way compatible with all TS targets
                    const foundClientIds = allClientIds.filter((value, index, self) => self.indexOf(value) === index);
                    
                    if (foundClientIds.length > 0 && !foundClientIds.includes(expectedClientId)) {
                        console.error(`🚨 CLIENT ID MISMATCH DETECTED!`);
                        console.error(`   - This App (${window.location.hostname}) expects: ${expectedClientId}`);
                        console.error(`   - Browser actually has sessions for: ${foundClientIds.join(', ')}`);
                        console.group('👉 HOW TO FIX THIS:');
                        console.log('1. Go to AWS Amplify Console for this app.');
                        console.log('2. Add Environment Variables:');
                        console.log(`   NEXT_PUBLIC_USER_POOL_CLIENT_ID = ${foundClientIds[0]}`);
                        console.log('3. Redeploy the app.');
                        console.groupEnd();
                    }
                }
            }

            return value;
        } catch (error) {
            console.error('Error getting cookie:', error);
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            const saltedKey = this.prefix + key;
            const cookieOptions: Cookies.CookieAttributes = {
                path: '/', // Must match the path used when setting
            };

            // Only set domain in production
            if (this.domain && !this.domain.includes('localhost')) {
                cookieOptions.domain = this.domain;
            }

            Cookies.remove(saltedKey, cookieOptions);
        } catch (error) {
            console.error('Error removing cookie:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            const allCookies = Cookies.get();
            Object.keys(allCookies).forEach((key) => {
                if (key.includes('CognitoIdentityServiceProvider')) {
                    // Try removing with and without prefix for safety
                    Cookies.remove(key, { path: '/', domain: this.domain });
                }
            });
        } catch (error) {
            console.error('Error clearing cookies:', error);
        }
    }
}
