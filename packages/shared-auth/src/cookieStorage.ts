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

    constructor(options: {
        domain?: string;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
    } = {}) {
        this.domain = options.domain || '';
        this.secure = options.secure ?? true;
        this.sameSite = options.sameSite || 'lax';
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
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

            Cookies.set(key, value, cookieOptions);

            // Debug logging in production
            if (this.domain) {
                console.log(`🍪 Set cookie: ${key.substring(0, 30)}... with domain: ${this.domain}`);
            }
        } catch (error) {
            console.error('Error setting cookie:', error);
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            return Cookies.get(key) || null;
        } catch (error) {
            console.error('Error getting cookie:', error);
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            const cookieOptions: Cookies.CookieAttributes = {
                path: '/', // Must match the path used when setting
            };

            // Only set domain in production
            if (this.domain && !this.domain.includes('localhost')) {
                cookieOptions.domain = this.domain;
            }

            Cookies.remove(key, cookieOptions);
        } catch (error) {
            console.error('Error removing cookie:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            const allCookies = Cookies.get();
            Object.keys(allCookies).forEach((key) => {
                if (key.startsWith('CognitoIdentityServiceProvider')) {
                    this.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing cookies:', error);
        }
    }
}
