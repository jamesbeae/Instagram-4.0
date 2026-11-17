import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PostActions from './PostActions';
import { Post } from '../models/Post';
import postsListSlice from '../lib/redux/postsListSlice';
const http = { post: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));
const post: Post = { _id: 'post', caption: 'Example', userId: { _id: 'owner', username: 'owner', email: 'owner@example.com', fullName: 'Owner', bio: null, avatar: null }, photoVideo: [], likes: [], comments: [] };
const mount = () => render(<Provider store={configureStore({ reducer: { authSlice: () => ({ userInfo: { _id: 'viewer' }, accessToken: 'test' }), postsListSlice: postsListSlice.reducer }, preloadedState: { postsListSlice: [post] } })}><PostActions post={post}/></Provider>);
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
describe('Post interactions', () => {
    it('keeps like state and count when the API fails', async () => { http.post.mockRejectedValue(new Error('offline')); mount(); fireEvent.click(screen.getByRole('button', { name: 'Like post' })); await screen.findByText(/Unable to update like/); expect(screen.getByText('0 likes')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Like post' })).toHaveAttribute('aria-pressed', 'false'); });
    it('uses the persisted response after liking', async () => { http.post.mockResolvedValue({}); http.get.mockResolvedValue({ data: { post: { ...post, likes: [{ _id: 'like', userId: 'viewer', postId: 'post' }] } } }); mount(); fireEvent.click(screen.getByRole('button', { name: 'Like post' })); await waitFor(() => expect(screen.getByRole('button', { name: 'Unlike post' })).toHaveAttribute('aria-pressed', 'true')); expect(screen.getByText('1 like')).toBeInTheDocument(); });
    it('does not mark a post saved after a failed save', async () => { http.post.mockRejectedValue(new Error('offline')); mount(); fireEvent.click(screen.getByRole('button', { name: 'Save post' })); await screen.findByText(/Unable to save post/); expect(screen.getByRole('button', { name: 'Save post' })).toHaveAttribute('aria-pressed', 'false'); });
});
