import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import http from '../lib/axios/http';
export default function PasswordRecovery() { const reset = useLocation().pathname === '/reset-password', token = new URLSearchParams(useLocation().search).get('token'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false); async function submit() { setBusy(true); try {
    const r = await http.post(reset ? '/auth/reset-password' : '/auth/forgot-password', reset ? { token, password } : { email });
    setMessage(r.data.message);
}
catch (e: any) {
    setMessage(e.response?.data?.message || 'Unable to complete request');
}
finally {
    setBusy(false);
} } return <main className="min-h-screen bg-dark text-white flex items-center justify-center"><form className="border border-lightDark p-8 max-w-md flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit(); }}><h1 className="text-xl">{reset ? 'Choose a new password' : 'Recover your account'}</h1>{reset ? <label>New password<input className="block bg-dark border p-2 w-full" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/></label> : <label>Email<input className="block bg-dark border p-2 w-full" type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>}<button disabled={busy} type="submit">{busy ? 'Please wait…' : reset ? 'Update password' : 'Send recovery email'}</button>{message && <p role="status">{message}</p>}<Link to="/login" className="text-blue">Back to login</Link></form></main>; }
