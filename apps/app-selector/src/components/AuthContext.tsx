'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import {
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    getCurrentUser,
    fetchAuthSession,
    type SignInInput,
    type SignUpInput,
} from 'aws-amplify/auth';

interface User {
    userId: string;
    username: string;
    email?: string;
    groups: string[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ isSignUpComplete: boolean; nextStep: string }>;
    confirmSignUp: (email: string, code: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();
            const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];

            setUser({
                userId: currentUser.userId,
                username: currentUser.username,
                email: currentUser.signInDetails?.loginId,
                groups,
            });
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, []);

    const handleSignIn = async (email: string, password: string) => {
        try {
            await signIn({ username: email, password });
        } catch (error: any) {
            const msg = error?.message || '';
            if (msg.includes('already a signed in user') || error?.name === 'SignInException') {
                console.warn('⚠️ Already signed in according to Amplify. Force signing out and retrying...');
                try {
                    await signOut();
                } catch (e) {
                    console.error('Failed to sign out during recovery:', e);
                }
                // Retry sign in
                await signIn({ username: email, password });
            } else {
                throw error;
            }
        }
        await refreshUser();
    };

    const handleSignUp = async (email: string, password: string) => {
        const result = await signUp({
            username: email,
            password,
            options: {
                userAttributes: {
                    email,
                },
            },
        });
        return {
            isSignUpComplete: result.isSignUpComplete,
            nextStep: result.nextStep.signUpStep,
        };
    };

    const handleConfirmSignUp = async (email: string, code: string) => {
        await confirmSignUp({ username: email, confirmationCode: code });
    };

    const handleSignOut = async () => {
        await signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                signIn: handleSignIn,
                signUp: handleSignUp,
                confirmSignUp: handleConfirmSignUp,
                signOut: handleSignOut,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
