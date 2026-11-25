import '@testing-library/jest-dom';
import { act, render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PostActions from './PostActions';
import { Post } from '../models/Post';
import postsListSlice from '../lib/redux/postsListSlice';
const http = { post: vi.fn(), delete: vi.fn(), get: vi.fn() };
const emit = vi.fn();
const inboxState = { inbox: { contacts: [
    { _id: 'first', fullName: 'First Person', username: 'first' },
    { _id: 'second', fullName: 'Second Person', username: 'second' },
] }, failed: false };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));
vi.mock('./RootLayout/MessageInboxProvider', () => ({ useMessageInbox: () => inboxState }));
vi.mock('../socket/socket', () => ({ socket: { connected: true, timeout: () => ({ emit }) } }));
const post: Post = { _id: 'post', caption: 'Example', userId: { _id: 'owner', username: 'owner', email: 'owner@example.com', fullName: 'Owner', bio: null, avatar: null }, photoVideo: [], likes: [], comments: [] };
const mount = () => render(<Provider store={configureStore({ reducer: { authSlice: () => ({ userInfo: { _id: 'viewer' }, accessToken: 'test' }), postsListSlice: postsListSlice.reducer }, preloadedState: { postsListSlice: [post] } })}><PostActions post={post}/></Provider>);
beforeEach(() => {
    vi.resetAllMocks();
    if (!HTMLDialogElement.prototype.showModal) {
        Object.defineProperties(HTMLDialogElement.prototype, {
            showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
            close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } },
        });
    }
});
afterEach(cleanup);
describe('Post interactions', () => {
    it('keeps like state and count when the API fails', async () => { http.post.mockRejectedValue(new Error('offline')); mount(); fireEvent.click(screen.getByRole('button', { name: 'Like post' })); await screen.findByText(/Unable to update like/); expect(screen.getByText('0 likes')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Like post' })).toHaveAttribute('aria-pressed', 'false'); });
    it('uses the persisted response after liking', async () => { http.post.mockResolvedValue({}); http.get.mockResolvedValue({ data: { post: { ...post, likes: [{ _id: 'like', userId: 'viewer', postId: 'post' }] } } }); mount(); fireEvent.click(screen.getByRole('button', { name: 'Like post' })); await waitFor(() => expect(screen.getByRole('button', { name: 'Unlike post' })).toHaveAttribute('aria-pressed', 'true')); expect(screen.getByText('1 like')).toBeInTheDocument(); });
    it('keeps a successful like when the follow-up refresh fails', async () => { http.post.mockResolvedValue({}); http.get.mockRejectedValue(new Error('refresh offline')); mount(); fireEvent.click(screen.getByRole('button', { name: 'Like post' })); await waitFor(() => expect(screen.getByRole('button', { name: 'Unlike post' })).toHaveAttribute('aria-pressed', 'true')); expect(screen.getByText('1 like')).toBeInTheDocument(); expect(screen.queryByText(/Unable to update like/)).not.toBeInTheDocument(); });
    it('does not mark a post saved after a failed save', async () => { http.post.mockRejectedValue(new Error('offline')); mount(); fireEvent.click(screen.getByRole('button', { name: 'Save post' })); await screen.findByText(/Unable to save post/); expect(screen.getByRole('button', { name: 'Save post' })).toHaveAttribute('aria-pressed', 'false'); });

    it('sends a post to the selected chat and retries a timed-out send without changing its message ID', async () => {
        http.post.mockResolvedValue({});
        mount();
        const shareButton = screen.getByRole('button', { name: 'Share post' });
        shareButton.focus();
        fireEvent.click(shareButton);
        const popup = within(screen.getByRole('dialog', { name: 'Share post' }));
        expect(popup.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(popup.getByRole('button', { name: 'Send' })).toHaveClass('ui-button-primary');
        expect(popup.getAllByRole('radio')).toHaveLength(2);
        fireEvent.change(popup.getByRole('searchbox'), { target: { value: 'second' } });
        fireEvent.click(popup.getByRole('radio', { name: /Second Person/ }));
        fireEvent.click(popup.getByRole('button', { name: 'Send' }));
        const [event, payload, callback] = emit.mock.calls[0];
        expect(event).toBe('sendMessage');
        expect(payload).toEqual({ receiverId: 'second', contents: location.origin + '/post/post', messageId: expect.any(String) });
        act(() => callback(new Error('Timeout')));
        expect(popup.getByRole('alert')).toHaveTextContent('Please try again');
        expect(http.post).not.toHaveBeenCalled();
        fireEvent.click(popup.getByRole('button', { name: 'Send' }));
        expect(emit.mock.calls[1][1]).toEqual(payload);
        act(() => emit.mock.calls[1][2](null, { ok: true }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(shareButton).toHaveFocus());
        expect(screen.getByText('Post sent to Second Person.')).toBeInTheDocument();
        expect(http.post).toHaveBeenCalledWith('/post/post/interaction', { type: 'SHARE' });
    });
});
