import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PostManagement from './PostManagement';
import postsListSlice from '../lib/redux/postsListSlice';
import postDetailModalSlice from '../lib/redux/postDetailModalSlice';
import { Post } from '../models/Post';

const http = { delete: vi.fn(), patch: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));

const post: Post = {
    _id: 'post-id',
    caption: 'A post to delete',
    userId: { _id: 'owner-id', username: 'owner', email: 'owner@example.com', fullName: 'Owner', bio: null, avatar: null },
    photoVideo: [],
    likes: [],
    comments: [],
};

const mount = () => render(
    <Provider store={configureStore({
        reducer: {
            authSlice: () => ({ userInfo: { _id: 'owner-id' } }),
            postsListSlice: postsListSlice.reducer,
            postDetailModalSlice: postDetailModalSlice.reducer,
        },
        preloadedState: { postsListSlice: [post] },
    })}>
        <PostManagement post={post} />
    </Provider>,
);

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Post deletion flow', () => {
    it('does not call the API when the owner cancels confirmation', () => {
        vi.stubGlobal('confirm', vi.fn(() => false));
        mount();
        fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
        expect(http.delete).not.toHaveBeenCalled();
    });

    it('removes the post from the list only after the API confirms deletion', async () => {
        vi.stubGlobal('confirm', vi.fn(() => true));
        http.delete.mockResolvedValue({});
        mount();
        fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
        await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/post/post-id'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the deletion unconfirmed when the API fails', async () => {
        vi.stubGlobal('confirm', vi.fn(() => true));
        http.delete.mockRejectedValue(new Error('offline'));
        mount();
        fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to delete post');
    });
});
