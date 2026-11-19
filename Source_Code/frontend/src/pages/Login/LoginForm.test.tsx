import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from '.';
import loginService from '../../services/loginService';
import authSlice from '../../lib/redux/authSlice';

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
        await user.type(screen.getByLabelText('Email'), 'admin@example.com');
        await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
        expect(await screen.findByText('Admin workspace')).toBeInTheDocument();
        expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    });
});
