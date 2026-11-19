import { useState, type FormEvent } from 'react';
import { faCircleHalfStroke, faIdCard, faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AppearanceSettings from '../components/Theme/AppearanceSettings';
import Avatar from '../components/UI/Avatar/Avatar';
import Button from '../components/UI/Button/Button';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input/Input';
import { useUnsavedChanges } from '../components/UnsavedChanges';
import usePrivateHttp from '../hooks/usePrivateHttp';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { authActions } from '../lib/redux/authSlice';
import './Settings.css';

const sections = [
    { id: 'profile', label: 'Profile', icon: faIdCard },
    { id: 'appearance', label: 'Appearance', icon: faCircleHalfStroke },
    { id: 'password', label: 'Password', icon: faLock },
] as const;

export default function Settings() {
    const user = useAppSelector(state => state.authSlice.userInfo);
    const profileName = user?.fullName || user?.username;
    const [activeSection, setActiveSection] = useState<typeof sections[number]['id']>('password');

    return (
        <main className="settings-page" aria-labelledby="settings-title">
            <div className="settings-content">
                <h1 id="settings-title">Account settings</h1>
                <div className="settings-grid">
                    <Card className="settings-section-menu">
                        <nav aria-label="Settings sections">
                            {sections.map(section => (
                                <Button key={section.id} className="settings-section-link"
                                    aria-current={activeSection === section.id ? 'true' : undefined}
                                    aria-controls={`settings-${section.id}-panel`}
                                    onClick={() => setActiveSection(section.id)}>
                                    <FontAwesomeIcon icon={section.icon} aria-hidden="true" />
                                    {section.label}
                                </Button>
                            ))}
                        </nav>
                    </Card>
                    <div id="settings-profile-panel" hidden={activeSection !== 'profile'}>
                        {user && (
                            <Card as="section" className="settings-card" aria-labelledby="settings-profile-title">
                                <header className="settings-section-header">
                                    <span className="settings-icon" aria-hidden="true"><FontAwesomeIcon icon={faIdCard} /></span>
                                    <h2 id="settings-profile-title">Profile</h2>
                                </header>
                                <div className="settings-profile">
                                    <span aria-hidden="true"><Avatar avatarUrl={user.avatar} username={user.username} className="settings-avatar" /></span>
                                    <div className="settings-identity">
                                        <p>{profileName}</p>
                                        {user.username && <p className="settings-muted">@{user.username}</p>}
                                    </div>
                                    <Link to={`/profile/${user._id}`} className="settings-profile-link">View profile</Link>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div id="settings-appearance-panel" hidden={activeSection !== 'appearance'}>
                        <AppearanceSettings />
                    </div>
                    <div id="settings-password-panel" hidden={activeSection !== 'password'}>
                        <PasswordSettings />
                    </div>
                </div>
            </div>
        </main>
    );
}

function PasswordSettings() {
    const http = usePrivateHttp();
    const dispatch = useAppDispatch();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const { markSaved } = useUnsavedChanges(Boolean(currentPassword || newPassword));
    const canSubmit = Boolean(currentPassword) && newPassword.length >= 8 && !saving;

    async function changePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        setError('');
        try {
            await http.post('/auth/change-password', { currentPassword, newPassword });
            markSaved();
            dispatch(authActions.loggedOut());
        } catch (reason) {
            const message = isAxiosError<{ message?: string }>(reason) ? reason.response?.data?.message : undefined;
            setError(message || 'Unable to change password. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card as="section" className="settings-card settings-password" aria-labelledby="settings-password-title">
            <header className="settings-section-header">
                <span className="settings-icon" aria-hidden="true"><FontAwesomeIcon icon={faLock} /></span>
                <h2 id="settings-password-title">Change password</h2>
            </header>
            <form onSubmit={changePassword} aria-busy={saving} className="settings-password-form">
                <div className="settings-password-fields">
                    <div className="settings-field">
                        <label htmlFor="settings-current-password">Current password</label>
                        <Input id="settings-current-password" name="currentPassword" type="password" autoComplete="current-password"
                            className="settings-input" required disabled={saving} getInputValueHandler={setCurrentPassword} />
                    </div>
                    <div className="settings-field">
                        <label htmlFor="settings-new-password">New password</label>
                        <Input id="settings-new-password" name="newPassword" type="password" autoComplete="new-password"
                            className="settings-input" required minLength={8} maxLength={128} disabled={saving}
                            aria-describedby="settings-password-hint" getInputValueHandler={setNewPassword} />
                        <p id="settings-password-hint" className="settings-muted">Use at least 8 characters.</p>
                    </div>
                </div>
                {error && <p role="alert" className="settings-error">{error}</p>}
                <div className="settings-form-actions">
                    <p className="settings-muted">Changing your password signs you out on all devices.</p>
                    <Button type="submit" className="settings-submit" disabled={!canSubmit}>
                        {saving ? 'Changing password…' : 'Change password'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
