import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginForm from './LoginForm';
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
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/admin" element={<p>Admin workspace</p>} />
                    <Route path="/" element={<p>Home feed</p>} />
                </Routes>
            </MemoryRouter>
        </Provider>);
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'admin@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(await screen.findByText('Admin workspace')).toBeInTheDocument();
        expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    });
});
