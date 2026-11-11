import { useState } from 'react';
import { Profile } from '../models/Profile';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { authActions } from '../lib/redux/authSlice';
export default function ProfileEditor({ profile, onClose }: {
    profile: Profile;
    onClose: () => void;
}) {
    const [name, setName] = useState(profile.fullName), [bio, setBio] = useState(profile.bio || ''), [avatar, setAvatar] = useState(profile.avatar || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const http = usePrivateHttp(), dispatch = useAppDispatch(), token = useAppSelector(s => s.authSlice.accessToken);
    async function save() { setBusy(true); try {
        const r = await http.patch('/user/me', { fullName: name, bio, avatar });
        dispatch(authActions.loggedIn({ userInfo: r.data.userInfo, accessToken: token }));
        onClose();
        location.reload();
    }
    catch (e: any) {
        setError(e.response?.data?.message || 'Unable to update profile');
    }
    finally {
        setBusy(false);
    } }
    return <div role="dialog" aria-label="Edit profile" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"><div className="bg-dark text-white border p-6 rounded flex flex-col gap-3 w-96"><h2>Edit profile</h2><label>Full name<input className="block bg-dark border p-2 w-full" value={name} onChange={e => setName(e.target.value)} maxLength={120}/></label><label>Bio<textarea className="block bg-dark border p-2 w-full" value={bio} onChange={e => setBio(e.target.value)} maxLength={2000}/></label><label>Avatar URL<input className="block bg-dark border p-2 w-full" type="url" value={avatar} onChange={e => setAvatar(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save profile'}</button><button onClick={onClose}>Cancel</button></div></div>;
}
