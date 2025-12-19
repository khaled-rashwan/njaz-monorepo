'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

type AuthMode = 'signin' | 'signup' | 'confirm';

interface AuthFormProps {
    onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
    const { signIn, signUp, confirmSignUp } = useAuth();
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (mode === 'signin') {
                await signIn(email, password);
                onSuccess?.();
            } else if (mode === 'signup') {
                const result = await signUp(email, password);
                if (!result.isSignUpComplete) {
                    setMode('confirm');
                } else {
                    onSuccess?.();
                }
            } else if (mode === 'confirm') {
                await confirmSignUp(email, confirmCode);
                // After confirmation, sign in
                await signIn(email, password);
                onSuccess?.();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="glass-card glass-card-cyan p-6 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">
                        {mode === 'signin' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'confirm' && 'Verify Email'}
                    </h2>
                    <p className="text-slate-400 text-xs">
                        {mode === 'signin' && 'Sign in to access your apps'}
                        {mode === 'signup' && 'Join the platform'}
                        {mode === 'confirm' && 'Enter the code sent to your email'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode !== 'confirm' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-surface-900/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-njaz-500 focus:ring-2 focus:ring-njaz-500/20 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-900/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-njaz-500 focus:ring-2 focus:ring-njaz-500/20 transition-all"
                                    placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                                />
                            </div>
                        </>
                    )}

                    {mode === 'confirm' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Confirmation Code
                            </label>
                            <input
                                type="text"
                                value={confirmCode}
                                onChange={(e) => setConfirmCode(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-surface-900/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-njaz-500 focus:ring-2 focus:ring-njaz-500/20 transition-all text-center text-2xl tracking-widest font-mono"
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-gold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            <>
                                {mode === 'signin' && 'Sign In'}
                                {mode === 'signup' && 'Create Account'}
                                {mode === 'confirm' && 'Verify'}
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center text-sm text-slate-400">
                    {mode === 'signin' && (
                        <>
                            Don't have an account?{' '}
                            <button
                                onClick={() => setMode('signup')}
                                className="text-njaz-400 hover:text-njaz-300 font-medium transition-colors"
                            >
                                Sign up
                            </button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <>
                            Already have an account?{' '}
                            <button
                                onClick={() => setMode('signin')}
                                className="text-njaz-400 hover:text-njaz-300 font-medium transition-colors"
                            >
                                Sign in
                            </button>
                        </>
                    )}
                    {mode === 'confirm' && (
                        <button
                            onClick={() => setMode('signin')}
                            className="text-njaz-400 hover:text-njaz-300 font-medium transition-colors"
                        >
                            Back to sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
