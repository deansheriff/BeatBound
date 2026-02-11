'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { usersApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const disabled = useMemo(() => !user || saving, [user, saving]);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        setError(null);

        try {
            const response = await usersApi.updateProfile({
                displayName: displayName || undefined,
                bio: bio || undefined,
                avatarUrl: avatarUrl || undefined,
            });

            setUser(response.data.user);
            setMessage('Profile updated');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return <div className="text-muted-foreground">Loading profile...</div>;
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your public account details.</p>
            </div>

            <form onSubmit={onSubmit} className="glass-card p-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input value={user.username} disabled className="input-default opacity-70 cursor-not-allowed" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Display Name</label>
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input-default"
                        placeholder="How your name appears"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Avatar URL</label>
                    <input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="input-default"
                        placeholder="https://..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="input-default min-h-[120px]"
                        placeholder="Tell people about yourself"
                    />
                </div>

                {message && <p className="text-emerald-400 text-sm">{message}</p>}
                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={disabled} className="btn-primary inline-flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </form>
        </div>
    );
}
