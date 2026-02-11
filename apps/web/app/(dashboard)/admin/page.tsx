'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil, Trash2, ShieldAlert, X } from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import { cn, formatCurrency } from '@/lib/utils';

type AdminTab = 'users' | 'challenges' | 'reports';
type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'VOTING' | 'ENDED' | 'CANCELLED';
type Challenge = {
    id: string;
    title: string;
    genre: string;
    status: ChallengeStatus;
    prizeAmount: string;
    submissionCount: number;
    producer?: { id: string; username: string };
};

const schema = z.object({
    producerId: z.string().uuid('Producer ID must be a UUID'),
    title: z.string().min(3),
    description: z.string().min(10),
    genre: z.string().min(1),
    beatUrl: z.string().url(),
    coverImageUrl: z.string().url().or(z.literal('')),
    rules: z.string().optional(),
    prizeAmount: z.coerce.number().min(0),
    maxSubmissions: z.coerce.number().int().min(1).max(1000),
    status: z.enum(['DRAFT', 'ACTIVE', 'VOTING', 'ENDED', 'CANCELLED']),
    submissionDeadline: z.string().optional(),
    votingDeadline: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const TRANSITIONS: Record<ChallengeStatus, ChallengeStatus[]> = {
    DRAFT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['VOTING', 'CANCELLED'],
    VOTING: ['ENDED', 'CANCELLED'],
    ENDED: [],
    CANCELLED: [],
};

const defaults: FormData = {
    producerId: '',
    title: '',
    description: '',
    genre: '',
    beatUrl: '',
    coverImageUrl: '',
    rules: '',
    prizeAmount: 0,
    maxSubmissions: 100,
    status: 'DRAFT',
    submissionDeadline: '',
    votingDeadline: '',
};

const toIso = (v?: string) => (v ? new Date(v).toISOString() : undefined);
const toLocal = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : '');

export default function AdminPage() {
    const user = useAuthStore((s) => s.user);
    const qc = useQueryClient();
    const [tab, setTab] = useState<AdminTab>('users');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'all' | ChallengeStatus>('all');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const isAdmin = user?.role === 'ADMIN';
    const key = ['admin-challenges', status, page] as const;

    const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: defaults });

    const users = useQuery({
        queryKey: ['admin-users', search],
        queryFn: () => adminApi.listUsers({ search: search || undefined, limit: 50 }),
        enabled: isAdmin,
    });
    const challenges = useQuery({
        queryKey: key,
        queryFn: () => adminApi.listChallenges({ status, page, limit: 10 }),
        enabled: isAdmin,
    });
    const reports = useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => adminApi.listReports({ status: 'PENDING', limit: 50 }),
        enabled: isAdmin,
    });

    const updateRole = useMutation({
        mutationFn: (p: { id: string; role: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN' }) => adminApi.updateUserRole(p.id, p.role),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    });
    const suspend = useMutation({
        mutationFn: (p: { id: string; suspended: boolean }) => adminApi.suspendUser(p.id, p.suspended, p.suspended ? 'Suspended by admin' : undefined),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    });
    const resolve = useMutation({
        mutationFn: (p: { id: string; status: 'RESOLVED' | 'DISMISSED' }) => adminApi.resolveReport(p.id, p.status, 'Handled by admin'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
    });

    const create = useMutation({
        mutationFn: (v: FormData) => adminApi.createChallenge({ ...v, coverImageUrl: v.coverImageUrl || undefined, submissionDeadline: toIso(v.submissionDeadline), votingDeadline: toIso(v.votingDeadline) }),
        onMutate: async (v) => {
            await qc.cancelQueries({ queryKey: key });
            const prev = qc.getQueryData<any>(key);
            qc.setQueryData<any>(key, (old: any) => {
                if (!old?.data || page !== 1) return old;
                const optimistic = { id: `tmp-${Date.now()}`, title: v.title, genre: v.genre, status: v.status, prizeAmount: String(v.prizeAmount), submissionCount: 0, producer: { id: v.producerId, username: 'pending' } };
                return { ...old, data: { ...old.data, challenges: [optimistic, ...(old.data.challenges || [])].slice(0, 10), pagination: { ...old.data.pagination, total: (old.data.pagination?.total || 0) + 1 } } };
            });
            return { prev };
        },
        onError: (_e, _v, c) => c?.prev && qc.setQueryData(key, c.prev),
        onSettled: () => qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
    });

    const update = useMutation({
        mutationFn: (p: { id: string; data: Partial<FormData> }) => adminApi.updateChallenge(p.id, { ...p.data, submissionDeadline: toIso(p.data.submissionDeadline), votingDeadline: toIso(p.data.votingDeadline) }),
        onMutate: async (p) => {
            await qc.cancelQueries({ queryKey: key });
            const prev = qc.getQueryData<any>(key);
            qc.setQueryData<any>(key, (old: any) => {
                if (!old?.data?.challenges) return old;
                return { ...old, data: { ...old.data, challenges: old.data.challenges.map((c: any) => (c.id === p.id ? { ...c, ...p.data, prizeAmount: p.data.prizeAmount !== undefined ? String(p.data.prizeAmount) : c.prizeAmount } : c)) } };
            });
            return { prev };
        },
        onError: (_e, _v, c) => c?.prev && qc.setQueryData(key, c.prev),
        onSettled: () => qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => adminApi.deleteChallenge(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: key });
            const prev = qc.getQueryData<any>(key);
            qc.setQueryData<any>(key, (old: any) => {
                if (!old?.data?.challenges) return old;
                return { ...old, data: { ...old.data, challenges: old.data.challenges.filter((c: any) => c.id !== id), pagination: { ...old.data.pagination, total: Math.max((old.data.pagination?.total || 1) - 1, 0) } } };
            });
            return { prev };
        },
        onError: (_e, _v, c) => c?.prev && qc.setQueryData(key, c.prev),
        onSettled: () => qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
    });

    const tabs = useMemo(() => [{ id: 'users', label: 'Users' }, { id: 'challenges', label: 'Challenges' }, { id: 'reports', label: 'Reports' }], []);

    const openCreate = () => { setEditing(null); form.reset(defaults); setOpen(true); };
    const openEdit = async (id: string) => {
        const res = await adminApi.getChallenge(id);
        const c = res.data?.challenge;
        setEditing(c);
        form.reset({ producerId: c.producerId || '', title: c.title || '', description: c.description || '', genre: c.genre || '', beatUrl: c.beatUrl || '', coverImageUrl: c.coverImageUrl || '', rules: c.rules || '', prizeAmount: Number(c.prizeAmount || 0), maxSubmissions: Number(c.maxSubmissions || 100), status: c.status || 'DRAFT', submissionDeadline: toLocal(c.submissionDeadline), votingDeadline: toLocal(c.votingDeadline) });
        setOpen(true);
    };
    const close = () => { setOpen(false); setEditing(null); };
    const submit = form.handleSubmit(async (v) => { editing ? await update.mutateAsync({ id: editing.id, data: v }) : await create.mutateAsync(v); close(); });

    if (!isAdmin) {
        return <div className="glass-card p-8 max-w-2xl"><div className="flex items-center gap-2 text-red-400"><ShieldAlert className="h-5 w-5" />Admin access required.</div></div>;
    }

    const rows: Challenge[] = challenges.data?.data?.challenges ?? [];
    const pg = challenges.data?.data?.pagination;

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold text-foreground">Admin Console</h1><p className="text-muted-foreground mt-1">Manage users, challenges, and moderation queue.</p></div>
            <div className="flex flex-wrap gap-2">{tabs.map((t: any) => <button key={t.id} onClick={() => setTab(t.id)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition', tab === t.id ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>{t.label}</button>)}</div>

            {tab === 'users' && <div className="glass-card p-5 space-y-4"><input value={search} onChange={(e) => setSearch(e.target.value)} className="input-default" placeholder="Search by email or username" />{users.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <div className="space-y-3">{(users.data?.data?.users ?? []).map((u: any) => <div key={u.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-3 justify-between"><div><div className="text-foreground font-medium">{u.email}</div><div className="text-xs text-muted-foreground">{u.username} | role: {u.role} | suspended: {String(u.suspended)}</div></div><div className="flex gap-2"><select defaultValue={u.role} onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as any })} className="input-default py-2 px-3"><option value="FAN">FAN</option><option value="ARTIST">ARTIST</option><option value="PRODUCER">PRODUCER</option><option value="ADMIN">ADMIN</option></select>{u.role !== 'ADMIN' && <button onClick={() => suspend.mutate({ id: u.id, suspended: !u.suspended })} className="btn-secondary px-3 py-2 text-sm">{u.suspended ? 'Unsuspend' : 'Suspend'}</button>}</div></div>)}</div>}</div>}

            {tab === 'challenges' && (
                <div className="glass-card p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-foreground">Challenge CRUD</h2>
                        <div className="flex gap-2">
                            <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} className="input-default py-2 px-3">
                                <option value="all">All</option><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="VOTING">VOTING</option><option value="ENDED">ENDED</option><option value="CANCELLED">CANCELLED</option>
                            </select>
                            <button onClick={openCreate} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Plus className="h-4 w-4" />New</button>
                        </div>
                    </div>
                    {challenges.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : rows.length === 0 ? <div className="text-sm text-muted-foreground">No challenges found.</div> : (
                        <div className="space-y-3">
                            {rows.map((c) => (
                                <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="text-foreground font-semibold">{c.title}</div>
                                            <div className="text-xs text-muted-foreground">{c.genre} | {c.status} | submissions: {c.submissionCount} | {formatCurrency(c.prizeAmount || 0)}</div>
                                            <div className="text-xs text-muted-foreground">Producer: {c.producer?.username || '-'} ({c.producer?.id || '-'})</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(c.id)} className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-1"><Pencil className="h-4 w-4" />Edit</button>
                                            <button onClick={() => remove.mutate(c.id)} className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-1"><Trash2 className="h-4 w-4" />Delete</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {TRANSITIONS[c.status].map((next) => <button key={`${c.id}-${next}`} onClick={() => update.mutate({ id: c.id, data: { status: next } })} className="btn-ghost px-3 py-1 text-xs">Move to {next}</button>)}
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">Page {pg?.page || page} of {Math.max(pg?.totalPages || 1, 1)} ({pg?.total || rows.length} total)</div>
                                <div className="flex gap-2">
                                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary px-3 py-2 text-sm disabled:opacity-50">Previous</button>
                                    <button disabled={page >= (pg?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-3 py-2 text-sm disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'reports' && <div className="glass-card p-5 space-y-3"><h2 className="text-lg font-semibold text-foreground">Pending Reports</h2>{reports.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (reports.data?.data?.reports ?? []).map((r: any) => <div key={r.id} className="rounded-lg border border-border p-3 space-y-2"><div className="text-foreground font-medium">{r.reason}</div><div className="text-xs text-muted-foreground">{r.contentType} | {r.contentId} | reporter: {r.reporter?.email}</div><div className="flex gap-2"><button onClick={() => resolve.mutate({ id: r.id, status: 'RESOLVED' })} className="btn-primary px-3 py-2 text-sm">Resolve</button><button onClick={() => resolve.mutate({ id: r.id, status: 'DISMISSED' })} className="btn-secondary px-3 py-2 text-sm">Dismiss</button></div></div>)}</div>}

            {open && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4">
                    <div className="mx-auto max-w-2xl glass-card p-6 relative mt-10 max-h-[90vh] overflow-y-auto">
                        <button onClick={close} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                        <h3 className="text-xl font-semibold text-foreground mb-4">{editing ? 'Edit Challenge' : 'Create Challenge'}</h3>
                        <form onSubmit={submit} className="space-y-3">
                            <input {...form.register('producerId')} className="input-default" placeholder="Producer ID (UUID)" />
                            {form.formState.errors.producerId && <p className="text-xs text-red-400">{form.formState.errors.producerId.message}</p>}
                            <input {...form.register('title')} className="input-default" placeholder="Title" />
                            <textarea {...form.register('description')} className="input-default min-h-[90px]" placeholder="Description" />
                            <div className="grid sm:grid-cols-2 gap-3">
                                <input {...form.register('genre')} className="input-default" placeholder="Genre" />
                                <input {...form.register('beatUrl')} className="input-default" placeholder="Beat URL" />
                                <input {...form.register('coverImageUrl')} className="input-default" placeholder="Cover URL (optional)" />
                                <select {...form.register('status')} className="input-default"><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="VOTING">VOTING</option><option value="ENDED">ENDED</option><option value="CANCELLED">CANCELLED</option></select>
                                <input type="number" step="0.01" {...form.register('prizeAmount')} className="input-default" placeholder="Prize Amount" />
                                <input type="number" {...form.register('maxSubmissions')} className="input-default" placeholder="Max Submissions" />
                                <input type="datetime-local" {...form.register('submissionDeadline')} className="input-default" />
                                <input type="datetime-local" {...form.register('votingDeadline')} className="input-default" />
                            </div>
                            <textarea {...form.register('rules')} className="input-default min-h-[70px]" placeholder="Rules (optional)" />
                            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={close} className="btn-secondary px-4 py-2 text-sm">Cancel</button><button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Challenge'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
