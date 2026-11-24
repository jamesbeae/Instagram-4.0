import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useUnsavedChanges } from '../components/UnsavedChanges';

const adminMetricGroups: Record<string, [string, string][]> = {
    accounts: [['All accounts', 'users'], ['Active accounts', 'activeUsers'], ['Disabled accounts', 'disabledUsers']],
    content: [['Posts', 'posts'], ['Stories', 'stories'], ['Reels', 'reels']],
    interactions: [['Follows', 'follows'], ['Likes', 'likes'], ['Comments', 'comments'], ['Saves', 'saves'], ['Messages', 'messages'], ['Behavior events', 'behaviorEvents']],
    reports: [['Open reports', 'openReports'], ['Resolved reports', 'resolvedReports']],
};

export default function Workspace() {
    const mode = useLocation().pathname.slice(1);
    const http = usePrivateHttp();
    const [groups, setGroups] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [moderationPosts, setModerationPosts] = useState<any[]>([]);
    const [actions, setActions] = useState<any[]>([]);
    const [stats, setStats] = useState<any | null>(null);
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [analyticsOptions, setAnalyticsOptions] = useState<any[]>([]);
    const [analyticsFrom, setAnalyticsFrom] = useState('');
    const [analyticsTo, setAnalyticsTo] = useState('');
    const [analyticsPostId, setAnalyticsPostId] = useState('');
    const [resolutions, setResolutions] = useState<Record<string, string>>({});
    const [moderationQuery, setModerationQuery] = useState('');
    const [moderationKind, setModerationKind] = useState('all');
    const [moderationStatus, setModerationStatus] = useState('all');
    const [moderationReasons, setModerationReasons] = useState<Record<string, string>>({});
    const [statsFrom, setStatsFrom] = useState('');
    const [statsTo, setStatsTo] = useState('');
    const [statsCategory, setStatsCategory] = useState('all');
    const [appliedStatsCategory, setAppliedStatsCategory] = useState('all');
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
            if (mode === 'admin') {
                const [reportResponse, userResponse, statsResponse, actionResponse, contentResponse] = await Promise.all([http.get('/admin/reports'), http.get('/admin/users'), http.get('/admin/stats'), http.get('/admin/actions'), http.get('/admin/content')]);
                setStats(statsResponse.data);
                setActions(actionResponse.data.actions);
                setReports(reportResponse.data.reports);
                setModerationPosts(contentResponse.data.postsList);
                setUsers(userResponse.data.users);
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

    const resolveReport = async (reportId: string, action: string) => {
        const done = await run(() => http.patch(`/admin/reports/${reportId}`, { action, resolution: resolutions[reportId]?.trim() }));
        if (done) setResolutions(current => ({ ...current, [reportId]: '' }));
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

    const applyAdminStats = async (clear = false) => {
        setError('');
        try {
            const response = await http.get('/admin/stats', { params: clear ? {} : {
                ...(statsFrom ? { from: statsFrom } : {}), ...(statsTo ? { to: statsTo } : {}), category: statsCategory,
            } });
            setStats(response.data);
            setAppliedStatsCategory(clear ? 'all' : statsCategory);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to load statistics');
        }
    };

    const searchModerationContent = async () => {
        setError('');
        try {
            const response = await http.get('/admin/content', { params: { q: moderationQuery, kind: moderationKind, status: moderationStatus } });
            setModerationPosts(response.data.postsList);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to load content for moderation');
        }
    };

    const moderateContent = async (postId: string, action: string) => {
        const done = await run(() => http.patch(`/admin/content/${postId}/moderate`, { action, resolution: moderationReasons[postId]?.trim() }));
        if (done) setModerationReasons(current => ({ ...current, [postId]: '' }));
    };

    return (
        <main className="flex-1 min-w-0 p-6 overflow-auto text-foreground space-y-5">
            <h1 className="text-2xl capitalize">{mode === 'groups' ? 'Relation lists' : mode === 'creator' ? 'Creator analytics' : 'Moderation'}</h1>
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

            {mode === 'admin' && <>
                <section className="flex flex-wrap items-end gap-3" aria-label="Filter system statistics">
                    <label className="grid gap-1">From<input aria-label="Statistics from date" type="date" value={statsFrom} onChange={e => setStatsFrom(e.target.value)} /></label>
                    <label className="grid gap-1">To<input aria-label="Statistics to date" type="date" value={statsTo} onChange={e => setStatsTo(e.target.value)} /></label>
                    <label className="grid gap-1">Category<select aria-label="Statistics category" className="bg-dark border p-2" value={statsCategory} onChange={e => setStatsCategory(e.target.value)}><option value="all">All categories</option><option value="accounts">Accounts</option><option value="content">Content</option><option value="interactions">Interactions</option><option value="reports">Reports</option></select></label>
                    <button className="border p-2" onClick={() => void applyAdminStats()}>View statistics</button>
                    <button className="border p-2" onClick={() => { setStatsFrom(''); setStatsTo(''); setStatsCategory('all'); void applyAdminStats(true); }}>Clear filters</button>
                </section>
                <section aria-label="System statistics" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats && (appliedStatsCategory === 'all' ? Object.values(adminMetricGroups).flat() : adminMetricGroups[appliedStatsCategory] || []).map(([label, key]) => <div key={key} className="border border-lightDark rounded p-3"><p className="text-sm text-textGray">{label}</p><p className="text-xl font-semibold">{stats[key]}</p></div>)}
                </section>
                <h2>Reports</h2>
                {reports.map(report => <section key={report.id} className="border p-3 space-y-2">
                    <p>{report.reason}</p><p className="text-xs">{report.status} · {report.postId || report.targetUserId}</p>
                    {report.status === 'open' && <>
                        <label className="grid gap-1">Resolution note<textarea aria-label={`Resolution note for report ${report.id}`} minLength={5} maxLength={1000} value={resolutions[report.id] || ''} onChange={e => setResolutions(current => ({ ...current, [report.id]: e.target.value }))} className="bg-dark border p-2" /></label>
                        <div className="flex gap-4">
                            <button disabled={(resolutions[report.id] || '').trim().length < 5} onClick={() => void resolveReport(report.id, 'dismiss')}>Dismiss</button>
                            {report.postId && <button disabled={(resolutions[report.id] || '').trim().length < 5} onClick={() => void resolveReport(report.id, 'hide-post')}>Hide post</button>}
                            {report.targetUserId && <button disabled={(resolutions[report.id] || '').trim().length < 5} onClick={() => void resolveReport(report.id, 'disable-user')}>Disable account</button>}
                        </div>
                    </>}
                </section>)}
                <h2>Content moderation</h2>
                <section className="flex flex-wrap items-end gap-3" aria-label="Search content to moderate">
                    <label className="grid gap-1">Search by text or ID<input aria-label="Moderation search" value={moderationQuery} maxLength={120} onChange={e => setModerationQuery(e.target.value)} className="bg-dark border p-2" /></label>
                    <label className="grid gap-1">Type<select aria-label="Moderation content type" className="bg-dark border p-2" value={moderationKind} onChange={e => setModerationKind(e.target.value)}><option value="all">All</option><option value="POST">Posts</option><option value="STORY">Stories</option><option value="REEL">Reels</option></select></label>
                    <label className="grid gap-1">Status<select aria-label="Moderation status" className="bg-dark border p-2" value={moderationStatus} onChange={e => setModerationStatus(e.target.value)}><option value="all">All</option><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label>
                    <button className="border p-2" onClick={() => void searchModerationContent()}>Search content</button>
                </section>
                {moderationPosts.map(post => <section key={post._id} className="border p-3 space-y-2">
                    <p className="font-semibold">{post.userId?.username || 'Unknown account'} · {post.kind} · {post.hidden ? 'Hidden' : 'Visible'}</p>
                    <p>{post.caption}</p><p className="text-xs break-all">{post._id}</p>
                    {post.photoVideo?.[0]?.type === 'VIDEO' ? <video className="max-h-80 max-w-full" src={post.photoVideo[0].url} controls preload="metadata" /> : post.photoVideo?.[0]?.url ? <img className="max-h-80 max-w-full object-contain" src={post.photoVideo[0].url} alt="Content under moderation" loading="lazy" /> : null}
                    <label className="grid gap-1">Decision note<textarea aria-label={`Moderation reason for ${post._id}`} minLength={5} maxLength={1000} value={moderationReasons[post._id] || ''} onChange={e => setModerationReasons(current => ({ ...current, [post._id]: e.target.value }))} className="bg-dark border p-2" /></label>
                    <button disabled={(moderationReasons[post._id] || '').trim().length < 5} onClick={() => void moderateContent(post._id, post.hidden ? 'keep' : 'hide')}>{post.hidden ? 'Restore visibility' : 'Hide content'}</button>
                </section>)}
                <h2>Accounts</h2>
                {users.map(user => <div key={user._id} className="flex gap-4 items-center border-t py-2"><span>{user.username}</span><select aria-label={`Role for ${user.username}`} className="bg-dark" value={user.role} onChange={e => void run(() => http.patch(`/admin/users/${user._id}`, { role: e.target.value }))}>{['user', 'creator', 'admin'].map(role => <option key={role}>{role}</option>)}</select><button onClick={() => void run(() => http.patch(`/admin/users/${user._id}`, { disabled: !user.disabled }))}>{user.disabled ? 'Enable' : 'Disable'}</button></div>)}
                <h2>Recent admin actions</h2>
                {actions.map(action => <p key={action.id} className="border-t border-lightDark py-2 text-sm">{action.action} · by {action.admin?.username || action.adminId} · target {action.targetUser?.username || action.targetUserId || action.reportId || 'system'} · {new Date(action.createdAt).toLocaleString()}</p>)}
            </>}
        </main>
    );
}
