'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldAlert } from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';

type AdminTab = 'users' | 'challenges' | 'reports';

export default function AdminPage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [tab, setTab] = useState<AdminTab>('users');
    const [search, setSearch] = useState('');
    const [newChallenge, setNewChallenge] = useState({
        producerId: '',
        title: '',
        description: '',
        genre: '',
        beatUrl: '',
        prizeAmount: 0,
    });

    const isAdmin = user?.role === 'ADMIN';

    const usersQuery = useQuery({
        queryKey: ['admin-users', search],
        queryFn: () => adminApi.listUsers({ search: search || undefined, limit: 50 }),
        enabled: isAdmin,
    });

    const challengesQuery = useQuery({
        queryKey: ['admin-challenges'],
        queryFn: () => adminApi.listChallenges({ status: 'all', limit: 50 }),
        enabled: isAdmin,
    });

    const reportsQuery = useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => adminApi.listReports({ status: 'PENDING', limit: 50 }),
        enabled: isAdmin,
    });

    const updateRole = useMutation({
        mutationFn: (payload: { id: string; role: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN' }) =>
            adminApi.updateUserRole(payload.id, payload.role),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });

    const toggleSuspend = useMutation({
        mutationFn: (payload: { id: string; suspended: boolean }) =>
            adminApi.suspendUser(payload.id, payload.suspended, payload.suspended ? 'Suspended by admin' : undefined),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    });

    const createChallenge = useMutation({
        mutationFn: () =>
            adminApi.createChallenge({
                ...newChallenge,
                prizeAmount: Number(newChallenge.prizeAmount || 0),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
            setNewChallenge({
                producerId: '',
                title: '',
                description: '',
                genre: '',
                beatUrl: '',
                prizeAmount: 0,
            });
        },
    });

    const deleteChallenge = useMutation({
        mutationFn: (id: string) => adminApi.deleteChallenge(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-challenges'] }),
    });

    const resolveReport = useMutation({
        mutationFn: (payload: { id: string; status: 'RESOLVED' | 'DISMISSED' }) =>
            adminApi.resolveReport(payload.id, payload.status, 'Handled by admin'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
    });

    const tabs: Array<{ id: AdminTab; label: string }> = useMemo(
        () => [
            { id: 'users', label: 'Users' },
            { id: 'challenges', label: 'Challenges' },
            { id: 'reports', label: 'Reports' },
        ],
        []
    );

    if (!isAdmin) {
        return (
            <div className="glass-card p-8 max-w-2xl">
                <div className="flex items-center gap-2 text-red-400">
                    <ShieldAlert className="h-5 w-5" />
                    Admin access required.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
                <p className="text-muted-foreground mt-1">Manage users, challenges, and moderation queue.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition',
                            tab === item.id ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'users' && (
                <div className="glass-card p-5 space-y-4">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-default"
                        placeholder="Search by email or username"
                    />
                    {usersQuery.isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                        <div className="space-y-3">
                            {(usersQuery.data?.data?.users ?? []).map((u: any) => (
                                <div key={u.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-3 justify-between">
                                    <div>
                                        <div className="text-foreground font-medium">{u.email}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {u.username} | role: {u.role} | suspended: {String(u.suspended)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            defaultValue={u.role}
                                            onChange={(e) =>
                                                updateRole.mutate({
                                                    id: u.id,
                                                    role: e.target.value as 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN',
                                                })
                                            }
                                            className="input-default py-2 px-3"
                                        >
                                            <option value="FAN">FAN</option>
                                            <option value="ARTIST">ARTIST</option>
                                            <option value="PRODUCER">PRODUCER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                        {u.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => toggleSuspend.mutate({ id: u.id, suspended: !u.suspended })}
                                                className="btn-secondary px-3 py-2 text-sm"
                                            >
                                                {u.suspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'challenges' && (
                <div className="space-y-5">
                    <div className="glass-card p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">Create Challenge (Admin)</h2>
                        <input
                            className="input-default"
                            placeholder="Producer User ID"
                            value={newChallenge.producerId}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, producerId: e.target.value }))}
                        />
                        <input
                            className="input-default"
                            placeholder="Title"
                            value={newChallenge.title}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, title: e.target.value }))}
                        />
                        <textarea
                            className="input-default min-h-[80px]"
                            placeholder="Description"
                            value={newChallenge.description}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, description: e.target.value }))}
                        />
                        <input
                            className="input-default"
                            placeholder="Genre"
                            value={newChallenge.genre}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, genre: e.target.value }))}
                        />
                        <input
                            className="input-default"
                            placeholder="Beat URL"
                            value={newChallenge.beatUrl}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, beatUrl: e.target.value }))}
                        />
                        <input
                            type="number"
                            className="input-default"
                            placeholder="Prize Amount"
                            value={newChallenge.prizeAmount}
                            onChange={(e) => setNewChallenge((prev) => ({ ...prev, prizeAmount: Number(e.target.value || 0) }))}
                        />
                        <button onClick={() => createChallenge.mutate()} className="btn-primary px-4 py-2 text-sm">
                            Create
                        </button>
                    </div>

                    <div className="glass-card p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">Challenge Records</h2>
                        {challengesQuery.isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                            (challengesQuery.data?.data?.challenges ?? []).map((c: any) => (
                                <div key={c.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-foreground font-medium">{c.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {c.genre} | {c.status} | {c.id}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteChallenge.mutate(c.id)} className="btn-secondary px-3 py-2 text-sm">
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {tab === 'reports' && (
                <div className="glass-card p-5 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Pending Reports</h2>
                    {reportsQuery.isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                        (reportsQuery.data?.data?.reports ?? []).map((r: any) => (
                            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="text-foreground font-medium">{r.reason}</div>
                                <div className="text-xs text-muted-foreground">
                                    {r.contentType} | {r.contentId} | reporter: {r.reporter?.email}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => resolveReport.mutate({ id: r.id, status: 'RESOLVED' })}
                                        className="btn-primary px-3 py-2 text-sm"
                                    >
                                        Resolve
                                    </button>
                                    <button
                                        onClick={() => resolveReport.mutate({ id: r.id, status: 'DISMISSED' })}
                                        className="btn-secondary px-3 py-2 text-sm"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
