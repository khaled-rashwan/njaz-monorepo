'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/data-schema';
import { useAuth } from '../../components/AuthContext';
import { FuturisticPanel, SharedHeader, SharedFooter } from '@njaz/ui-components';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();

const AVAILABLE_GROUPS = [
    'admins',
    'engineers',
    'devplatform-access',
    'scholar-access',
    'estebian-access',
    'pid-access',
    'interior-access',
    'clients'
];

interface CognitoUser {
    id: string;
    username: string;
    email: string;
    status: string;
    enabled: boolean;
    createdAt: string;
    groups: string | string[];
}

export default function AdminDashboard() {
    const { user, isLoading, isAuthenticated, signOut } = useAuth();
    const router = useRouter();
    
    const [isAiEnabled, setIsAiEnabled] = useState(true);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [savingKeys, setSavingKeys] = useState(false);

    const [users, setUsers] = useState<CognitoUser[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '' });

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        } else if (user && !user.groups.includes('admins')) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (user?.groups.includes('admins')) {
            fetchAdminData();
        }
    }, [user]);

    const fetchAdminData = async () => {
        setLoadingData(true);
        try {
            const currentClient = generateClient<Schema>();
            
            // Fetch Global Settings
            let settings = null;
            if (currentClient.models.AppSettings) {
                const { data } = await currentClient.models.AppSettings.get({ id: 'GLOBAL_CONFIG' });
                settings = data;
                if (settings) {
                    setIsAiEnabled(settings.isScholarAiEnabled ?? true);
                    setGeminiApiKey(settings.geminiApiKey || '');
                    setSlackWebhookUrl(settings.slackWebhookUrl || '');
                    setGithubToken(settings.githubToken || '');
                } else {
                    // Initialize if missing
                    await currentClient.models.AppSettings.create({ id: 'GLOBAL_CONFIG', isScholarAiEnabled: true });
                }
            } else {
                console.warn('AppSettings model not found on client. Using default.');
            }

            // Fetch Cognito Users
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            const resp = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (data.users) {
                setUsers(data.users);
            }

            // Fetch Scholar Profiles
            const profilesMap: Record<string, any> = {};
            if (currentClient.models.UserScholarProfile) {
                const { data: profilesList } = await currentClient.models.UserScholarProfile.list();
                profilesList.forEach((p: any) => {
                    profilesMap[p.id] = p;
                });
            } else {
                console.warn('UserScholarProfile model not found.');
            }
            setProfiles(profilesMap);

        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const toggleAi = async () => {
        const newValue = !isAiEnabled;
        setIsAiEnabled(newValue);
        try {
            const currentClient = generateClient<Schema>();
            if (currentClient.models.AppSettings) {
                await currentClient.models.AppSettings.update({ id: 'GLOBAL_CONFIG', isScholarAiEnabled: newValue });
            }
        } catch (error) {
            console.error('Error updating setting:', error);
            setIsAiEnabled(!newValue); // revert
        }
    };

    const saveApiKeys = async () => {
        setSavingKeys(true);
        try {
            const currentClient = generateClient<Schema>();
            if (currentClient.models.AppSettings) {
                await currentClient.models.AppSettings.update({
                    id: 'GLOBAL_CONFIG',
                    geminiApiKey: geminiApiKey || null,
                    slackWebhookUrl: slackWebhookUrl || null,
                    githubToken: githubToken || null,
                });
                alert('API Keys saved successfully!');
            }
        } catch (error) {
            console.error('Error saving API Keys:', error);
            alert('Failed to save API Keys: ' + (error as Error).message);
        } finally {
            setSavingKeys(false);
        }
    };

    const updateProfile = async (userId: string, updates: any) => {
        try {
            const currentClient = generateClient<Schema>();
            if (!currentClient.models.UserScholarProfile) return;

            const existing = profiles[userId];
            let updatedProfile;
            if (existing) {
                const { data } = await currentClient.models.UserScholarProfile.update({ id: userId, ...updates });
                updatedProfile = data;
            } else {
                const { data } = await currentClient.models.UserScholarProfile.create({ id: userId, ...updates });
                updatedProfile = data;
            }
            setProfiles(prev => ({ ...prev, [userId]: updatedProfile }));
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update Scholar profile: ' + (error as Error).message);
        }
    };

    const getUserGroups = (groups: any): string[] => {
        if (Array.isArray(groups)) {
            return groups;
        }
        if (typeof groups === 'string') {
            try {
                return JSON.parse(groups || '[]');
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const handleToggleGroup = async (username: string, group: string, currentlyHas: boolean) => {
        setSaving(username);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            const method = currentlyHas ? 'DELETE' : 'POST';
            const resp = await fetch(`/api/admin/users/${username}/groups`, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ group })
            });
            const data = await resp.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            // Update local state
            setUsers(prev => prev.map(u => {
                if (u.username === username) {
                    const currentGroups = getUserGroups(u.groups);
                    const newGroups = currentlyHas
                        ? currentGroups.filter(g => g !== group)
                        : [...currentGroups, group];
                    return { ...u, groups: newGroups };
                }
                return u;
            }));
        } catch (err: any) {
            console.error('Failed to toggle group:', err);
            alert('Failed to update group: ' + (err.message || String(err)));
        } finally {
            setSaving(null);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.username || !newUser.email) return;
        setSaving('new');
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            const resp = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(newUser)
            });
            const data = await resp.json();
            
            if (data.userId) {
                // Add user to local list
                setUsers(prev => [...prev, {
                    id: data.userId || newUser.username,
                    username: newUser.username,
                    email: newUser.email,
                    groups: [],
                    status: 'FORCE_CHANGE_PASSWORD',
                    enabled: true,
                    createdAt: new Date().toISOString()
                }]);
                setShowCreateModal(false);
                setNewUser({ username: '', email: '' });
            } else if (data.error) {
                alert(data.error);
            }
        } catch (err: any) {
            console.error('Failed to create user:', err);
            alert('Failed to create user: ' + (err.message || String(err)));
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!window.confirm('Are you sure you want to delete this user completely? This cannot be undone.')) return;
        setSaving(username);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            const resp = await fetch(`/api/admin/users/${username}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            
            if (data.success) {
                setUsers(prev => prev.filter(u => u.username !== username));
            } else if (data.error) {
                alert(data.error);
            }
        } catch (err: any) {
            console.error('Failed to delete user:', err);
            alert('Failed to delete user: ' + (err.message || String(err)));
        } finally {
            setSaving(null);
        }
    };

    if (isLoading || !user?.groups.includes('admins')) {
        return <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center text-cyan-400 font-mono">Initializing System Config...</div>;
    }

    const sharedUser = user && user.email ? {
        username: user.email.split('@')[0],
        email: user.email
    } : null;

    return (
        <div className="min-h-screen hero-section futuristic-bg flex flex-col pt-20">
            <SharedHeader currentApp="dashboard" externalUser={sharedUser} externalLogout={signOut} />
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <a href="/" className="text-cyan-400 hover:text-cyan-300 text-sm font-mono flex items-center gap-1">
                                    <span>←</span> Back to App Selector
                                </a>
                            </div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                                Unified Administration
                            </h1>
                            <p className="text-slate-400 text-sm">
                                Full user provisioning, Cognito group assignment, and Scholar AI feature management.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 transition-all font-mono px-4 py-2 rounded-lg text-sm"
                        >
                            + Create User
                        </button>
                    </div>

                    {/* Global Master Kill-switch & API Key Management */}
                    <FuturisticPanel title="Global Settings & API Keys" glowColor="purple">
                        <div className="space-y-6">
                            {/* Kill switch */}
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
                                <div>
                                    <h3 className="text-lg font-semibold text-white font-mono">Scholar AI Co-Authoring</h3>
                                    <p className="text-sm text-slate-400">Master kill-switch for the AI feature across all users.</p>
                                </div>
                                <button
                                    onClick={toggleAi}
                                    className={`px-6 py-2 rounded-lg font-mono font-bold transition-all ${
                                        isAiEnabled 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30' 
                                        : 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                                    }`}
                                >
                                    {isAiEnabled ? 'ENABLED' : 'DISABLED'}
                                </button>
                            </div>

                            {/* API keys inputs */}
                            <div className="p-6 bg-slate-900/50 rounded-lg border border-purple-500/20 space-y-4">
                                <h3 className="text-lg font-semibold text-white font-mono mb-2">Platform API Key Credentials</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-mono text-slate-500 mb-1 block">Gemini API Key</label>
                                        <input
                                            type="password"
                                            value={geminiApiKey}
                                            onChange={e => setGeminiApiKey(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/40 font-mono"
                                            placeholder="AI Studio API Key"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-mono text-slate-500 mb-1 block">Slack Webhook URL</label>
                                        <input
                                            type="password"
                                            value={slackWebhookUrl}
                                            onChange={e => setSlackWebhookUrl(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/40 font-mono"
                                            placeholder="Slack Incoming Webhook URL"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-mono text-slate-500 mb-1 block">GitHub Token</label>
                                        <input
                                            type="password"
                                            value={githubToken}
                                            onChange={e => setGithubToken(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/40 font-mono"
                                            placeholder="GitHub Personal Access Token"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={saveApiKeys}
                                        disabled={savingKeys}
                                        className="bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 transition-all font-mono px-4 py-2 rounded-lg text-sm relative flex items-center justify-center min-w-[120px]"
                                    >
                                        {savingKeys ? (
                                            <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                        ) : (
                                            'Save Keys'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </FuturisticPanel>

                    {/* Users Management Grid */}
                    <FuturisticPanel title="User Access Control & Quotas" glowColor="cyan">
                        {loadingData ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                                <div className="text-slate-400 font-mono text-sm">Querying Cognito User Pool...</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-cyan-500/10">
                                <table className="w-full text-left text-sm text-slate-300 border-collapse">
                                    <thead>
                                        <tr className="bg-slate-950/60 border-b border-cyan-500/20 text-xs uppercase font-mono text-slate-400">
                                            <th className="px-4 py-4">User</th>
                                            <th className="px-4 py-4">Access Groups</th>
                                            <th className="px-4 py-4">Scholar AI Profile</th>
                                            <th className="px-4 py-4">Joined</th>
                                            <th className="px-4 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40 bg-slate-900/20">
                                        {users.map(u => {
                                            const profile = profiles[u.id] || { billingTier: 'FREE', apiCreditsRemaining: 10, isAiSuspended: false };
                                            const userGroups = getUserGroups(u.groups);
                                            const isProcessing = saving === u.username;

                                            return (
                                                <tr key={u.id} className="hover:bg-slate-800/25 transition-colors">
                                                    {/* User basic info */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                                                                {u.email ? u.email.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-white max-w-[200px] truncate" title={u.email}>{u.email || u.username}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{u.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Cognito groups */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                            {AVAILABLE_GROUPS.map(group => {
                                                                const hasGroup = userGroups.includes(group);
                                                                return (
                                                                    <button
                                                                        key={group}
                                                                        disabled={isProcessing}
                                                                        onClick={() => handleToggleGroup(u.username, group, hasGroup)}
                                                                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                                                            hasGroup
                                                                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300'
                                                                                : 'bg-transparent border-slate-800 text-slate-500 hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400'
                                                                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                        title={hasGroup ? `Remove from ${group}` : `Add to ${group}`}
                                                                    >
                                                                        {group} {hasGroup ? '✓' : '+'}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    {/* Scholar AI specific flags */}
                                                    <td className="px-4 py-4 space-y-2">
                                                        <div className="flex items-center gap-4">
                                                            {/* Tier selection */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-slate-500 font-mono">Tier:</span>
                                                                <select
                                                                    value={profile.billingTier}
                                                                    onChange={(e) => updateProfile(u.id, { billingTier: e.target.value })}
                                                                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/40"
                                                                >
                                                                    <option value="FREE">FREE</option>
                                                                    <option value="PRO">PRO</option>
                                                                    <option value="ENTERPRISE">ENTERPRISE</option>
                                                                </select>
                                                            </div>

                                                            {/* Credits control */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-slate-500 font-mono">Credits:</span>
                                                                <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{profile.apiCreditsRemaining}</span>
                                                                <button 
                                                                    onClick={() => updateProfile(u.id, { apiCreditsRemaining: profile.apiCreditsRemaining + 10 })}
                                                                    className="text-cyan-400 hover:text-cyan-300 text-[10px] px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded font-mono"
                                                                >
                                                                    +10
                                                                </button>
                                                                <button 
                                                                    onClick={() => updateProfile(u.id, { apiCreditsRemaining: 0 })}
                                                                    className="text-red-400 hover:text-red-300 text-[10px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded font-mono"
                                                                >
                                                                    Reset
                                                                </button>
                                                            </div>

                                                            {/* Status enable/disable toggle */}
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-slate-500 font-mono">AI:</span>
                                                                <button 
                                                                    onClick={() => updateProfile(u.id, { isAiSuspended: !profile.isAiSuspended })}
                                                                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                                                        profile.isAiSuspended 
                                                                        ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' 
                                                                        : 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30'
                                                                    }`}
                                                                >
                                                                    {profile.isAiSuspended ? 'Suspended' : 'Active'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Joined Date */}
                                                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap font-mono">
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </td>

                                                    {/* Admin user delete */}
                                                    <td className="px-4 py-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteUser(u.username)}
                                                            disabled={isProcessing}
                                                            className={`p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors ${
                                                                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                            title="Delete User"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                                                    No users found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </FuturisticPanel>
                </div>
            </main>
            <SharedFooter />

            {/* ── Create User Modal ──────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-6 w-full max-w-sm shadow-2xl shadow-cyan-500/5">
                        <h3 className="text-lg font-bold text-white mb-1 font-mono">Create New User</h3>
                        <p className="text-slate-400 text-xs mb-4">Provision a new account in the system pool.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-mono text-slate-500 mb-1 block">Username</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-sm text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                                    placeholder="e.g. johndoe"
                                />
                                <p className="text-[9px] text-slate-500 mt-1">Username is unique and cannot be modified later.</p>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-mono text-slate-500 mb-1 block">Email Address</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-sm text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="bg-transparent border border-slate-800 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded text-sm transition-all"
                                disabled={saving === 'new'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={!newUser.username || !newUser.email || saving === 'new'}
                                className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 transition-all px-4 py-2 rounded text-sm relative flex items-center justify-center min-w-[80px]"
                            >
                                {saving === 'new' ? (
                                    <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
