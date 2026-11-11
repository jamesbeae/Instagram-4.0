import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useAppDispatch } from '../hooks/useStore';
import { authActions } from '../lib/redux/authSlice';
export default function Workspace() {
    const mode = useLocation().pathname.slice(1), http = usePrivateHttp(), dispatch = useAppDispatch();
    const [groups, setGroups] = useState<any[]>([]), [users, setUsers] = useState<any[]>([]), [reports, setReports] = useState<any[]>([]), [analytics, setAnalytics] = useState<any[]>([]), [error, setError] = useState(''), [name, setName] = useState(''), [currentPassword, setCurrentPassword] = useState(''), [newPassword, setNewPassword] = useState('');
    const load = async () => { setError(''); try {
        if (mode === 'groups') {
            const [g, u] = await Promise.all([http.get('/groups'), http.get('/user/get-all-users')]);
            setGroups(g.data.groups);
            setUsers(u.data.users);
        }
        if (mode === 'creator') {
            const r = await http.get('/creator/analytics');
            setAnalytics(r.data.posts);
        }
        if (mode === 'admin') {
            const [r, u] = await Promise.all([http.get('/admin/reports'), http.get('/admin/users')]);
            setReports(r.data.reports);
            setUsers(u.data.users);
        }
    }
    catch (e: any) {
        setError(e.response?.data?.message || 'Unable to load data');
    } };
    useEffect(() => { load(); }, [mode, http]);
    const run = async (fn: () => Promise<unknown>) => { try {
        await fn();
        await load();
    }
    catch (e: any) {
        setError(e.response?.data?.message || 'Unable to complete action');
    } };
    return <main className="flex-1 min-w-0 p-6 overflow-auto text-white space-y-5"><h1 className="text-2xl capitalize">{mode === 'groups' ? 'Relation lists' : mode === 'creator' ? 'Creator analytics' : mode === 'admin' ? 'Moderation' : 'Account settings'}</h1>{error && <p role="alert" className="text-red-400">{error}</p>}
 {mode === 'groups' && <><form onSubmit={e => { e.preventDefault(); run(() => http.post('/groups', { name })).then(() => setName('')); }} className="flex gap-2"><input aria-label="List name" value={name} maxLength={100} onChange={e => setName(e.target.value)} className="bg-dark border p-2" placeholder="Friends, colleagues, family…"/><button disabled={!name.trim()} type="submit">Create list</button></form>{groups.map(g => <section key={g.id} className="border border-lightDark rounded p-4 space-y-3"><h2 className="font-semibold">{g.name}</h2><div>{g.members.map((m: any) => <div key={m.id} className="flex gap-4">{m.user?.username}<button onClick={() => run(() => http.delete('/groups/' + g.id + '/members/' + m.userId))}>Remove</button></div>)}</div><select aria-label={'Add member to ' + g.name} className="bg-dark border p-2" value="" onChange={e => { if (e.target.value)
        run(() => http.post('/groups/' + g.id + '/members', { userId: e.target.value })); }}><option value="">Add a member</option>{users.filter(u => !g.members.some((m: any) => m.userId === u._id)).map(u => <option key={u._id} value={u._id}>{u.username}</option>)}</select><button className="ml-4" onClick={() => { if (confirm('Remove this list?'))
        run(() => http.delete('/groups/' + g.id)); }}>Delete list</button></section>)}</>}
 {mode === 'creator' && <><button className="border p-2" onClick={() => run(() => http.post('/user/become-creator'))}>Enable creator account</button>{analytics.length > 0 ? <table className="w-full text-sm"><thead><tr>{['Post', 'Views', 'Likes', 'Comments', 'Saves', 'Shares'].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{analytics.map(p => <tr key={p.id}>{[p.caption, p.views, p.likes, p.comments, p.saves, p.shares].map((v, i) => <td key={i} className="border-t border-lightDark p-2">{v}</td>)}</tr>)}</tbody></table> : <p>Your content statistics appear here after publishing.</p>}</>}
 {mode === 'admin' && <><h2>Reports</h2>{reports.map(r => <section key={r.id} className="border p-3 space-y-2"><p>{r.reason}</p><p className="text-xs">{r.status} · {r.postId || r.targetUserId}</p>{r.status === 'open' && <div className="flex gap-4"><button onClick={() => run(() => http.patch('/admin/reports/' + r.id, { action: 'dismiss' }))}>Dismiss</button>{r.postId && <button onClick={() => run(() => http.patch('/admin/reports/' + r.id, { action: 'hide-post' }))}>Hide post</button>}{r.targetUserId && <button onClick={() => run(() => http.patch('/admin/reports/' + r.id, { action: 'disable-user' }))}>Disable account</button>}</div>}</section>)}<h2>Accounts</h2>{users.map(u => <div key={u._id} className="flex gap-4 items-center border-t py-2"><span>{u.username}</span><select aria-label={'Role for ' + u.username} className="bg-dark" value={u.role} onChange={e => run(() => http.patch('/admin/users/' + u._id, { role: e.target.value }))}>{['user', 'creator', 'admin'].map(r => <option key={r}>{r}</option>)}</select><button onClick={() => run(() => http.patch('/admin/users/' + u._id, { disabled: !u.disabled }))}>{u.disabled ? 'Enable' : 'Disable'}</button></div>)}</>}
 {mode === 'settings' && <form className="flex flex-col gap-3 max-w-md" onSubmit={async (e) => { e.preventDefault(); try {
        await http.post('/auth/change-password', { currentPassword, newPassword });
        dispatch(authActions.loggedOut());
        location.assign('/login');
    }
    catch (e: any) {
        setError(e.response?.data?.message || 'Unable to change password');
    } }}><h2>Change password</h2><label>Current password<input type="password" className="block bg-dark border p-2 w-full" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password"/></label><label>New password<input type="password" minLength={8} className="block bg-dark border p-2 w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"/></label><button type="submit">Change password</button></form>}
 </main>;
}
