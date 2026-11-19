import '@testing-library/jest-dom';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RequireAuth from '../components/RequireAuth';
import ThemeProvider from '../components/Theme/ThemeProvider';
import UnsavedChangesProvider from '../components/UnsavedChanges';
import authSlice, { authActions } from '../lib/redux/authSlice';
import Settings from './Settings';

const http = { post: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));

const NativeRequest = Request;
beforeEach(() => {
    // The router's jsdom AbortSignal is incompatible with Node's Request.
    vi.stubGlobal('Request', class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
            super(input, { ...init, signal: undefined });
        }
    });
    if (!HTMLDialogElement.prototype.showModal) {
        Object.defineProperties(HTMLDialogElement.prototype, {
            showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
            close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } },
        });
    }
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    http.post.mockReset();
    localStorage.removeItem('instagram-theme');
    delete document.documentElement.dataset.theme;
});

function openSettings() {
    const store = configureStore({ reducer: { authSlice: authSlice.reducer } });
    store.dispatch(authActions.loggedIn({
        userInfo: { _id: 'me', username: 'owner', fullName: 'Test owner', avatar: null }, accessToken: 'test-token',
    }));
    const router = createMemoryRouter([{
        element: <UnsavedChangesProvider />,
        children: [
            { path: '/login', element: <h1>Log in</h1> },
            { element: <RequireAuth />, children: [{ path: '/settings', element: <Settings /> }] },
            { path: '/profile/:id', element: <h1>Profile page</h1> },
        ],
    }], { initialEntries: ['/settings'] });
    render(<Provider store={store}><ThemeProvider><RouterProvider router={router} /></ThemeProvider></Provider>);
    return store;
}

it('shows the active profile and protects an unfinished password change when leaving', async () => {
    openSettings();
    expect(screen.getByRole('button', { name: 'Password' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('link', { name: 'View profile' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', '/profile/me');
    expect(screen.getByText('Test owner')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    fireEvent.click(screen.getByRole('link', { name: 'View profile' }));
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
    expect(screen.getByLabelText('Current password')).toHaveValue('old-password');
});

it('keeps password fields after a failed request and returns to login after a successful retry', async () => {
    const store = openSettings();
    http.post.mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'Current password is incorrect' } } });
    http.post.mockResolvedValueOnce({ data: { status: 200 } });
    const submit = screen.getByRole('button', { name: 'Change password' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-password' } });
    const next = screen.getByLabelText('New password');
    fireEvent.change(next, { target: { value: 'short' } });
    expect(submit).toBeDisabled();
    fireEvent.change(next, { target: { value: 'new-long-password' } });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
    expect(next).toHaveValue('new-long-password');

    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Log in' })).toBeVisible());
    expect(http.post).toHaveBeenLastCalledWith('/auth/change-password', {
        currentPassword: 'old-password', newPassword: 'new-long-password',
    });
    expect(store.getState().authSlice.userInfo).toBeUndefined();
});
