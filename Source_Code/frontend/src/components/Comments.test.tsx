import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, it, expect, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import PostDescription from './PostDetailModal/PostDescription';
import FeedComment from '../pages/Home/PostsList/Post/PostComment';
import postsListSlice from '../lib/redux/postsListSlice';
import { Post } from '../models/Post';

const http = { post: vi.fn(), get: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));
vi.mock('@emoji-mart/react', () => ({ default: () => <div>Emoji picker</div> }));
vi.mock('./PostDetailModal/PostDescription/PostActions/PostReact', () => ({ default: () => null }));
vi.mock('./PostManagement', () => ({ default: () => null }));
const author = { _id: 'owner', username: 'owner', fullName: 'Owner', email: 'owner@example.com', avatar: null, bio: null };
const post: Post = { _id: 'post', caption: 'Example caption', userId: author, photoVideo: [], likes: [], comments: [] };
const comment = { _id: 'comment', content: 'New comment', userId: author, postId: 'post', likes: [], createdAt: new Date().toISOString() };
const mount = (feed = false) => {
    const store = configureStore({ reducer: { authSlice: () => ({ userInfo: author }), postsListSlice: postsListSlice.reducer }, preloadedState: { postsListSlice: [post] } });
    render(<Provider store={store}><MemoryRouter>{feed ? <FeedComment postId={post._id} /> : <PostDescription postData={post} />}</MemoryRouter></Provider>);
    return store;
};
beforeEach(() => {
    vi.resetAllMocks();
    http.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/comment/') ? { comments: [] } : { post: { ...post, comments: [comment] } } }));
    http.post.mockResolvedValue({ data: { comment } });
});
afterEach(cleanup);

it('sends a detail comment with Enter, shows it and updates the feed count', async () => {
    const store = mount();
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'New comment' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/comment/create-comment', { postId: 'post', content: 'New comment' }));
    expect(await screen.findByText('New comment')).toBeInTheDocument();
    expect(input).toHaveValue('');
    await waitFor(() => expect(store.getState().postsListSlice[0].comments).toHaveLength(1));
});

it('preserves the draft and shows an error when the server rejects a comment', async () => {
    http.post.mockRejectedValue({ response: { status: 404 } });
    mount();
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByText('Post', { exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/comment|available|permission/i);
    expect(input).toHaveValue('Keep this draft');
    expect(screen.queryByText('New comment')).not.toBeInTheDocument();
});

it('does not submit Shift+Enter or an IME composition key', async () => {
    mount();
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'Draft' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument());
    expect(http.post).not.toHaveBeenCalled();
});

it('prevents duplicate sends while a comment request is in flight', async () => {
    let finish: (value: unknown) => void = () => {};
    http.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    mount();
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'New comment' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    finish({ data: { comment } });
    expect(await screen.findByText('New comment')).toBeInTheDocument();
});

it('keeps the saved comment when refreshing the post fails, including feed input', async () => {
    http.get.mockRejectedValue(new Error('refresh offline'));
    const store = mount(true);
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'New comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(input).toHaveValue(''));
    await waitFor(() => expect(store.getState().postsListSlice[0].comments).toHaveLength(1));
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('does not let a delayed initial comment list erase a newly saved comment', async () => {
    let resolveList: (value: unknown) => void = () => {};
    http.get.mockImplementation(url => url.startsWith('/comment/') ? new Promise(resolve => { resolveList = resolve; }) : Promise.resolve({ data: { post: { ...post, comments: [comment] } } }));
    mount();
    const input = screen.getByPlaceholderText('Add a comment');
    fireEvent.change(input, { target: { value: 'New comment' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('New comment')).toBeInTheDocument();
    resolveList({ data: { comments: [] } });
    await waitFor(() => expect(screen.queryByText('Loading comments…')).not.toBeInTheDocument());
    expect(screen.getByText('New comment')).toBeInTheDocument();
});
