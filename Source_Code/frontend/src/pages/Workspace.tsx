import { useCallback, useEffect, useState } from 'react';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useUnsavedChanges } from '../components/UnsavedChanges';
import Button from '../components/UI/Button/Button';

export default function Workspace() {
    const http = usePrivateHttp();
    const [groups, setGroups] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [name, setName] = useState('');

    useUnsavedChanges(name !== '');

    const load = useCallback(async () => {
        setError('');
        try {
            const [groupResponse, userResponse] = await Promise.all([http.get('/groups'), http.get('/groups/eligible-members')]);
            setGroups(groupResponse.data.groups);
            setUsers(userResponse.data.users);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Unable to load data');
        }
    }, [http]);

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

    return (
        <main className="flex-1 min-w-0 p-6 overflow-auto text-foreground space-y-5">
            <h1 className="text-2xl capitalize">Relation lists</h1>
            {error && <p role="alert" className="text-red-400">{error}</p>}

            <form onSubmit={e => { e.preventDefault(); void run(() => http.post('/groups', { name })).then(saved => { if (saved) setName(current => current === name ? '' : current); }); }} className="flex gap-2">
                <input aria-label="List name" value={name} maxLength={100} onChange={e => setName(e.target.value)} className="bg-dark border p-2" placeholder="Friends, colleagues, family…" />
                <Button variant="primary" className="rounded-lg px-4 py-2" disabled={!name.trim()} type="submit">Create list</Button>
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
        </main>
    );
}
