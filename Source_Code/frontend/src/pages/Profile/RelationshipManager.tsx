import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/UI/Button/Button';
import usePrivateHttp from '../../hooks/usePrivateHttp';
import { useAppSelector } from '../../hooks/useStore';
import type { Profile } from '../../models/Profile';
import type { User } from '../../models/User';

type GroupMember = { id: string; userId: string; user?: User };
type RelationGroup = { id: string; name: string; members: GroupMember[] };
type RelationProfile = Profile & { followers?: User[]; followings?: User[] };

export default function RelationshipManager({ profile, onClose, onUnfollow }: { profile: RelationProfile; onClose: () => void; onUnfollow: (userId: string) => void }) {
    const http = usePrivateHttp();
    const userId = useAppSelector(state => state.authSlice.userInfo?._id);
    const [groups, setGroups] = useState<RelationGroup[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>(profile.followings || []);
    const [name, setName] = useState('');
    const [renaming, setRenaming] = useState<Record<string, string>>({});
    const [tab, setTab] = useState<'groups' | 'following' | 'followers'>('groups');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const isOwner = Boolean(userId && profile._id === userId);

    async function loadGroups() {
        const [groupResult, userResult] = await Promise.all([http.get('/groups'), http.get('/groups/eligible-members')]);
        setGroups(groupResult.data.groups || []);
        setUsers(userResult.data.users || []);
    }
    useEffect(() => {
        if (!isOwner) return;
        loadGroups().catch(() => setError('Không tải được nhóm quan hệ.'));
    }, [isOwner, http]);
    useEffect(() => setFollowing(profile.followings || []), [profile.followings]);

    async function run(action: () => Promise<unknown>): Promise<boolean> {
        setBusy(true); setError('');
        try { await action(); await loadGroups(); return true; }
        catch (reason: any) { setError(reason?.response?.data?.message || 'Không thể hoàn tất thao tác.'); return false; }
        finally { setBusy(false); }
    }
    async function createGroup(event: FormEvent) {
        event.preventDefault();
        const value = name.trim();
        if (!value) return;
        if (await run(() => http.post('/groups', { name: value }))) setName('');
    }
    async function unfollow(targetId: string) {
        setError('');
        try {
            await http.post('/user/delete-follow', { userId: targetId });
            setFollowing(current => current.filter(user => user._id !== targetId));
            onUnfollow(targetId);
            await loadGroups();
        } catch (reason: any) { setError(reason?.response?.data?.message || 'Không thể bỏ theo dõi tài khoản.'); }
    }

    if (!isOwner) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="relationship-manager-title" className="max-h-[min(85vh,700px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-lightDark bg-dark p-5 text-foreground shadow-2xl sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="relationship-manager-title" className="text-lg font-semibold">Manage Groups</h2><p className="mt-1 text-sm text-textSecondGray">Organize your groups and manage your connections.</p></div>
            <Button aria-label="Đóng" onClick={onClose} className="h-9 w-9 rounded-full text-xl text-textSecondGray hover:bg-lightDark hover:text-foreground">×</Button>
        </div>
            <div role="tablist" aria-label="Quản lý quan hệ" className="flex gap-2">
                {([['groups', 'Nhóm'], ['following', 'Đang theo dõi'], ['followers', 'Người theo dõi']] as const).map(([key, label]) => <Button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-lightDark text-foreground' : 'text-textSecondGray'}`}>{label}</Button>)}
            </div>
        {error && <p role="alert" className="mb-3 text-sm text-errorText">{error}</p>}
        {tab === 'groups' && <div className="mt-5 space-y-4">
            <form onSubmit={createGroup} className="flex gap-2">
                <input aria-label="Tên nhóm mới" value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Tên nhóm mới" className="min-w-0 flex-1 rounded-lg border border-lightSecondDark bg-dark px-3 py-2" />
                <Button variant="primary" type="submit" disabled={!name.trim() || busy} className="rounded-lg px-4 py-2">Tạo nhóm</Button>
            </form>
            {!groups.length && <p className="text-sm text-textSecondGray">Bạn chưa tạo nhóm quan hệ nào.</p>}
            {groups.map(group => <article key={group.id} className="rounded-xl border border-lightDark p-4">
                <div className="flex flex-wrap gap-2">
                    <input aria-label={`Tên nhóm ${group.name}`} value={renaming[group.id] ?? group.name} maxLength={100} onChange={event => setRenaming(current => ({ ...current, [group.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-lightSecondDark bg-dark px-3 py-2" />
                    <Button disabled={busy || !(renaming[group.id] ?? group.name).trim() || (renaming[group.id] ?? group.name) === group.name} onClick={() => run(async () => { await http.patch(`/groups/${group.id}`, { name: renaming[group.id].trim() }); setRenaming(current => { const next = { ...current }; delete next[group.id]; return next; }); })} className="rounded-lg border border-lightDark px-3 py-2">Đổi tên</Button>
                    <Button disabled={busy} onClick={() => { if (confirm('Xóa nhóm này? Nhóm đang được bài viết sử dụng sẽ không xóa được.')) void run(() => http.delete(`/groups/${group.id}`)); }} className="rounded-lg px-3 py-2 text-red-400">Xóa</Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select aria-label={`Thêm thành viên vào ${group.name}`} defaultValue="" disabled={busy} onChange={event => { const memberId = event.target.value; if (memberId) void run(() => http.post(`/groups/${group.id}/members`, { userId: memberId })); event.target.value = ''; }} className="rounded-lg border border-lightSecondDark bg-dark px-3 py-2">
                        <option value="">Thêm thành viên</option>
                        {users.filter(user => user._id !== userId && !group.members.some(member => member.userId === user._id)).map(user => <option key={user._id} value={user._id}>{user.username || user.fullName}</option>)}
                    </select>
                    {group.members.map(member => <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-lightDark px-3 py-1 text-sm">{member.user?.username || 'Tài khoản'}<button type="button" aria-label={`Xóa ${member.user?.username || 'thành viên'} khỏi ${group.name}`} disabled={busy} onClick={() => void run(() => http.delete(`/groups/${group.id}/members/${member.userId}`))}>×</button></span>)}
                </div>
            </article>)}
        </div>}
        {tab === 'following' && <div className="mt-5 space-y-2">{following.length ? following.map(user => <div key={user._id} className="flex items-center justify-between gap-3 rounded-lg border border-lightDark px-3 py-2"><Link to={`/profile/${user._id}`} className="truncate">{user.fullName || user.username}</Link><Button disabled={busy} onClick={() => void unfollow(user._id)} className="rounded-lg border border-lightDark px-3 py-1.5 text-sm">Bỏ theo dõi</Button></div>) : <p className="text-sm text-textSecondGray">Bạn chưa theo dõi tài khoản nào.</p>}</div>}
        {tab === 'followers' && <div className="mt-5 space-y-2">{profile.followers?.length ? profile.followers.map(user => <Link key={user._id} to={`/profile/${user._id}`} className="block rounded-lg border border-lightDark px-3 py-2">{user.fullName || user.username}</Link>) : <p className="text-sm text-textSecondGray">Bạn chưa có người theo dõi.</p>}</div>}
      </section>
    </div>;
}
