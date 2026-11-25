import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useUnsavedChanges } from '../components/UnsavedChanges';

export default function Workspace() {
    const mode = useLocation().pathname.slice(1);
    const http = usePrivateHttp();
    const [groups, setGroups] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [analyticsOptions, setAnalyticsOptions] = useState<any[]>([]);
    const [analyticsFrom, setAnalyticsFrom] = useState('');
    const [analyticsTo, setAnalyticsTo] = useState('');
    const [analyticsPostId, setAnalyticsPostId] = useState('');
    const [error, setError] = useState('');
    const [name, setName] = useState('');

    useUnsavedChanges(mode === 'groups' && name !== '');

    const load = useCallback(async () => {
        setError('');
        try {
            if (mode === 'groups') {
                const [groupResponse, userResponse] = await Promise.all([http.get('/groups'), http.get('/groups/eligible-members')]);
                setGroups(groupResponse.data.groups);
                setUsers(userResponse.data.users);
            }
            if (mode === 'creator') {
                const response = await http.get('/creator/analytics');
                setAnalytics(response.data.posts);
                setAnalyticsOptions(response.data.availablePosts || []);
            }
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to load data');
        }
    }, [mode, http]);

    useEffect(() => { void load(); }, [load]);

    const run = async (fn: () => Promise<unknown>) => {
        try {
            await fn();
            await load();
            return true;
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to complete action');
            return false;
        }
    };

    const applyAnalyticsFilters = async (clear = false) => {
        setError('');
        try {
            const response = await http.get('/creator/analytics', { params: clear ? {} : {
                ...(analyticsFrom ? { from: analyticsFrom } : {}),
                ...(analyticsTo ? { to: analyticsTo } : {}),
                ...(analyticsPostId ? { postId: analyticsPostId } : {}),
            } });
            setAnalytics(response.data.posts);
            setAnalyticsOptions(response.data.availablePosts || []);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to load analytics');
        }
    };

    return (
        <main className="flex-1 min-w-0 p-6 overflow-auto text-foreground space-y-5">
            <h1 className="text-2xl capitalize">{mode === 'groups' ? 'Relation lists' : 'Creator analytics'}</h1>
            {error && <p role="alert" className="text-red-400">{error}</p>}

            {mode === 'groups' && <>
                <form onSubmit={e => { e.preventDefault(); void run(() => http.post('/groups', { name })).then(saved => { if (saved) setName(current => current === name ? '' : current); }); }} className="flex gap-2">
                    <input aria-label="List name" value={name} maxLength={100} onChange={e => setName(e.target.value)} className="bg-dark border p-2" placeholder="Friends, colleagues, family…" />
                    <button disabled={!name.trim()} type="submit">Create list</button>
                </form>
                {groups.map(group => <section key={group.id} className="border border-lightDark rounded p-4 space-y-3">
                    <h2 className="font-semibold">{group.name}</h2>
                    <div>{group.members.map((member: any) => <div key={member.id} className="flex gap-4">{member.user?.username}<button onClick={() => void run(() => http.delete(`/groups/${group.id}/members/${member.userId}`))}>Remove</button></div>)}</div>
                    <select aria-label={`Add member to ${group.name}`} className="bg-dark border p-2" value="" onChange={e => { if (e.target.value) void run(() => http.post(`/groups/${group.id}/members`, { userId: e.target.value })); }}>
                        <option value="">Add a followed account</option>
                        {users.filter(user => !group.members.some((member: any) => member.userId === user._id)).map(user => <option key={user._id} value={user._id}>{user.username}</option>)}
                    </select>
                    <button className="ml-4" onClick={() => { if (confirm('Remove this list?')) void run(() => http.delete(`/groups/${group.id}`)); }}>Delete list</button>
                </section>)}
            </>}

            {mode === 'creator' && <>
                <button className="border p-2" onClick={() => void run(() => http.post('/user/become-creator'))}>Enable creator account</button>
                <section className="flex flex-wrap items-end gap-3" aria-label="Filter creator analytics">
                    <label className="grid gap-1">From<input aria-label="Analytics from date" type="date" value={analyticsFrom} onChange={e => setAnalyticsFrom(e.target.value)} /></label>
                    <label className="grid gap-1">To<input aria-label="Analytics to date" type="date" value={analyticsTo} onChange={e => setAnalyticsTo(e.target.value)} /></label>
                    <label className="grid gap-1">Content<select aria-label="Analytics content" value={analyticsPostId} onChange={e => setAnalyticsPostId(e.target.value)} className="bg-dark border p-2"><option value="">All content</option>{analyticsOptions.map(post => <option key={post.id} value={post.id}>{post.caption || 'Untitled post'}</option>)}</select></label>
                    <button className="border p-2" onClick={() => void applyAnalyticsFilters()}>Apply filters</button>
                    <button className="border p-2" onClick={() => { setAnalyticsFrom(''); setAnalyticsTo(''); setAnalyticsPostId(''); void applyAnalyticsFilters(true); }}>Clear filters</button>
                </section>
                {analytics.length > 0 ? <table className="w-full text-sm"><thead><tr>{['Post', 'Views', 'Likes', 'Comments', 'Saves', 'Shares'].map(heading => <th key={heading} className="text-left p-2">{heading}</th>)}</tr></thead><tbody>{analytics.map(post => <tr key={post.id}>{[post.caption, post.views, post.likes, post.comments, post.saves, post.shares].map((value, index) => <td key={index} className="border-t border-lightDark p-2">{value}</td>)}</tr>)}</tbody></table> : <p>No statistics match these filters.</p>}
            </>}

        </main>
    );
}
