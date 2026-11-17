import { afterEach, describe, expect, it, vi } from 'vitest';
import http from '../lib/axios/http';
import loginService from './loginService';

afterEach(() => { vi.restoreAllMocks(); });

describe('email login contract', () => {
    it('accepts a valid email and rejects a username-only login', () => {
        expect(loginService.validateLoginData({ email: 'user@example.com', password: 'secret' }).success).toBe(true);
        expect(loginService.validateLoginData({ email: 'not-an-email', password: 'secret' }).success).toBe(false);
    });

    it('sends the email address to the login API', async () => {
        const post = vi.spyOn(http, 'post').mockResolvedValue({ data: { accessToken: 'token' } } as never);
        await loginService.login({ email: 'user@example.com', password: 'secret' });
        expect(post).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'secret' });
    });
});
