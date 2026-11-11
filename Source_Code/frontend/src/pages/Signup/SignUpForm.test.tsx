import '@testing-library/jest-dom';
import SignUpForm from './SignUpForm';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../../lib/redux/authSlice';
afterEach(cleanup);
const mount = () => render(<Provider store={configureStore({ reducer: { authSlice: authSlice.reducer } })}><MemoryRouter><SignUpForm /></MemoryRouter></Provider>);
describe('Sign up form', () => {
    it('disables submission until required fields are filled', () => { mount(); expect(screen.getByRole('button', { name: /sign up/i })).toHaveClass('opacity-70'); });
    it('enables submission after fields are filled', () => { mount(); for (const placeholder of ['Email', 'Full Name', 'Username', 'Password'])
        fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: placeholder === 'Email' ? 'test@example.com' : 'example123' } }); expect(screen.getByRole('button', { name: /sign up/i })).not.toHaveClass('opacity-70'); });
    it('does not expose an unconfigured Facebook login', () => { mount(); expect(screen.queryByText(/login with facebook/i)).not.toBeInTheDocument(); });
});
