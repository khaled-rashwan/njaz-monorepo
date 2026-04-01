'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';

interface UserData {
    id: string;
    username: string;
    email: string;
    groups: string[];
    status: string;
    createdAt: string;
}

const AVAILABLE_GROUPS = ['admins', 'engineers', 'devplatform-access', 'clients'];

export default function UsersPage() {
    const { t } = useLanguage();
    const { isAdmin, hasAccess } = useAdminUser();
    
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '' });

    useEffect(() => {
        async function loadUsers() {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens?.accessToken?.toString();
                const resp = await fetch('/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                if (data.users) {
                    setUsers(data.users);
                }
            } catch (err) {
                console.error('Failed to load users:', err);
            } finally {
                setLoading(false);
            }
        }
        if (isAdmin) loadUsers();
    }, [isAdmin]);

    const handleToggleGroup = async (userId: string, group: string, currentlyHas: boolean) => {
        setSaving(userId);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            const method = currentlyHas ? 'DELETE' : 'POST';
            await fetch(`/api/admin/users/${userId}/groups`, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ group })
            });
            
            // Optimistic update
            setUsers(prev => prev.map(u => {
                if (u.id === userId) {
                    const newGroups = currentlyHas 
                        ? u.groups.filter(g => g !== group)
                        : [...u.groups, group];
                    return { ...u, groups: newGroups };
                }
                return u;
            }));
        } catch (err) {
            console.error('Failed to update group:', err);
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
                // Optimistically add user to the list
                setUsers(prev => [...prev, {
                    id: data.userId,
                    username: newUser.username,
                    email: newUser.email,
                    groups: [],
                    status: 'FORCE_CHANGE_PASSWORD',
                    createdAt: new Date().toISOString()
                }]);
                
                setShowCreateModal(false);
                setNewUser({ username: '', email: '' });
            } else if (data.error) {
                alert(data.error);
            }
        } catch (err) {
            console.error('Failed to create user:', err);
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure you want to delete this user completely? This cannot be undone.')) return;
        
        setSaving(userId);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            const resp = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await resp.json();
            if (data.success) {
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else if (data.error) {
                alert(data.error);
            }
        } catch (err) {
            console.error('Failed to delete user:', err);
        } finally {
            setSaving(null);
        }
    };

    if (!isAdmin) {
        return <div className="text-center py-20 text-slate-400">🔒 {t('Access denied. Admins only.', 'الوصول مرفوض. للمديرين فقط.')}</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-white mb-2">
                        {t('User Management', 'إدارة المستخدمين')}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {t('Manage user roles and system access.', 'إدارة أدوار المستخدمين وصلاحيات الوصول.')}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="futuristic-btn-primary text-sm !py-2"
                >
                    + {t('Create User', 'إنشاء مستخدم')}
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                </div>
            ) : (
                <div className="futuristic-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-cyan-500/20 bg-cyan-500/5 text-sm">
                                    <th className="p-4 text-slate-400 font-medium">User</th>
                                    <th className="p-4 text-slate-400 font-medium">Email</th>
                                    <th className="p-4 text-slate-400 font-medium whitespace-nowrap">Access Groups</th>
                                    <th className="p-4 text-slate-400 font-medium">Joined</th>
                                    <th className="p-4 text-slate-400 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 text-white font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                                                    {u.username.charAt(0).toUpperCase()}
                                                </div>
                                                {u.username}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">{u.email}</td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {AVAILABLE_GROUPS.map(group => {
                                                    const hasGroup = u.groups.includes(group);
                                                    const isProcessing = saving === u.id;
                                                    
                                                    return (
                                                        <button
                                                            key={group}
                                                            disabled={isProcessing}
                                                            onClick={() => handleToggleGroup(u.id, group, hasGroup)}
                                                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                                                                hasGroup
                                                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300'
                                                                    : 'bg-transparent border-slate-700 text-slate-500 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400'
                                                            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title={hasGroup ? 'Click to Remove' : 'Click to Add'}
                                                        >
                                                            {group} {hasGroup ? '✓' : '+'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                disabled={saving === u.id}
                                                className={`p-1.5 rounded bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
                                                    saving === u.id ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                                title="Delete User"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Create User Modal ──────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 relative">
                    <div className="futuristic-card rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4">{t('Create New User', 'إنشاء مستخدم جديد')}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Username', 'اسم المستخدم')}</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    className="futuristic-input text-sm"
                                    placeholder="e.g. jdoe123"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Username cannot be changed later.</p>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Email Address', 'البريد الإلكتروني')}</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="futuristic-input text-sm"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="futuristic-btn text-sm !py-2"
                                disabled={saving === 'new'}
                            >
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={!newUser.username || !newUser.email || saving === 'new'}
                                className="futuristic-btn-primary text-sm !py-2 relative flex items-center justify-center min-w-[80px]"
                            >
                                {saving === 'new' ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    t('Create', 'إنشاء')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
