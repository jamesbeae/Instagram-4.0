import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from '.';
import AdminLogin from './AdminLogin';
import loginService from '../../services/loginService';
import authSlice from '../../lib/redux/authSlice';
import RequireAuth from '../../components/RequireAuth';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('login flow', () => {
    it('sends email and routes an administrator to the admin workspace', async () => {
        const login = vi.spyOn(loginService, 'login').mockResolvedValue({
            success: true,
            data: { userInfo: { _id: 'admin-id', email: 'admin@example.com', role: { name: 'admin', id: 'admin-role' } }, accessToken: 'token' },
        } as never);
        render(<Provider store={configureStore({ reducer: { authSlice: authSlice.reducer } })}>
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={<p>Admin workspace</p>} />
                    <Route path="/" element={<p>Home feed</p>} />
                </Routes>
            </MemoryRouter>
        </Provider>);
        const user = userEvent.setup();
        expect(screen.getByRole('heading', { name: 'Log in' })).toBeVisible();
        expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/sign-up');
        expect(screen.getByRole('link', { name: 'Admin sign in' })).toHaveAttribute('href', '/admin/login');
        await user.type(screen.getByLabelText('Email'), 'admin@example.com');
        await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
        expect(await screen.findByText('Admin workspace')).toBeInTheDocument();
        expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    });

    it('redirects protected admin visits to the dedicated form and establishes a session only on success', async () => {
        const login = vi.spyOn(loginService, 'loginAdmin')
            .mockResolvedValueOnce({ success: false, message: 'This account does not have administrator access.' })
            .mockResolvedValueOnce({
                success: true,
                data: { userInfo: { _id: 'admin-id', role: { name: 'admin', id: 'admin-role' } }, accessToken: 'token' },
            });
        const store = configureStore({ reducer: { authSlice: authSlice.reducer } });
        render(<Provider store={store}>
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route element={<RequireAuth adminOnly />}>
                        <Route path="/admin" element={<p>Admin workspace</p>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </Provider>);

        const user = userEvent.setup();
        expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
        expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login');
        await user.type(screen.getByLabelText('Email'), 'admin@example.com');
        await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
        expect(await screen.findByRole('alert')).toHaveTextContent('administrator access');
        expect(store.getState().authSlice.userInfo).toBeFalsy();
        await user.click(screen.getByRole('button', { name: 'Sign in as admin' }));
        expect(await screen.findByText('Admin workspace')).toBeInTheDocument();
        expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    });
});
