import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { vi, it, expect, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import sideBarSlice, { sideBarActions } from '../../../lib/redux/sideBarSlice';
import postDetailModalSlice from '../../../lib/redux/postDetailModalSlice';
import SearchModal from './index';
const http = { get: vi.fn() };
vi.mock('../../../hooks/usePrivateHttp', () => ({ default: () => http }));
const mount = () => {
    const store = configureStore({ reducer: { sideBarSlice: sideBarSlice.reducer, postDetailModalSlice: postDetailModalSlice.reducer } });
    store.dispatch(sideBarActions.openModal('search'));
    render(<Provider store={store}><MemoryRouter><SearchModal /></MemoryRouter></Provider>);
    return store;
};
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
it('interleaves accounts and posts by default and continues paging when one kind runs out', async () => {
    const account = { _id: 'match', username: 'owner', fullName: 'Sample Owner' };
    const post = { _id: 'match', caption: 'Owner post', userId: { username: 'owner' }, photoVideo: [], likes: [], comments: [] };
    http.get.mockImplementation(async (_url, { params }) => ({
        data: params.scope === 'users'
            ? { users: params.page === 1 ? [account] : [], postsList: [], pagination: { total: 1, totalPages: 1 } }
            : { users: [], postsList: [params.page === 1 ? post : { ...post, _id: 'next', caption: 'Another owner post' }], pagination: { total: 6, totalPages: 2 } },
    }));
    mount();
    fireEvent.change(screen.getByPlaceholderText('Search accounts or posts'), { target: { value: 'owner' } });
    await screen.findByText('7 results found');
    const links = within(screen.getByRole('region', { name: 'Search results' })).getAllByRole('link');
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/profile/match', '/post/match']);
    expect(http.get.mock.calls.map(([, { params }]) => params)).toEqual([
        { q: 'owner', scope: 'users', page: 1, limit: 5 }, { q: 'owner', scope: 'posts', page: 1, limit: 5 },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: /Another owner post/ })).toHaveAttribute('href', '/post/next');
    expect(screen.queryByRole('link', { name: /Sample Owner/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Accounts' }));
    expect(await screen.findByRole('link', { name: /Sample Owner/ })).toHaveAttribute('href', '/profile/match');
    expect(http.get).toHaveBeenLastCalledWith('/search', expect.objectContaining({ params: { q: 'owner', scope: 'users', page: 1, limit: 10 } }));
});

it('shows a thumbnail, byline and interaction counts and opens the shared post preview', async () => {
    const post = {
        _id: 'post-id', caption: 'A searchable post', userId: { username: 'owner' },
        createdAt: '2026-10-11T04:00:00.000Z',
        photoVideo: [{ url: '/preview.jpg', type: 'PHOTO' }],
        likes: [{ _id: 'like' }], comments: [{ _id: 'a' }, { _id: 'b' }],
    };
    http.get.mockResolvedValue({ data: { users: [], postsList: [post], pagination: { total: 12, totalPages: 2 } } });
    const store = mount(); fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
    fireEvent.change(screen.getByPlaceholderText('Search accounts or posts'), { target: { value: 'searchable' } });
    const result = await screen.findByRole('link', { name: /owner.*A searchable post.*1 like.*2 comments/ });
    expect(result).toHaveAttribute('href', '/post/post-id');
    expect(result.querySelector('img')).toHaveAttribute('src', '/preview.jpg');
    expect(result.querySelector('time')).toHaveAttribute('datetime', post.createdAt);
    expect(screen.getByRole('status')).toHaveTextContent('12 posts found');
    expect(http.get.mock.calls[0][1].params.scope).toBe('posts');
    fireEvent.click(result);
    expect(store.getState().postDetailModalSlice).toMatchObject({ isOpen: true, post });
    expect(store.getState().sideBarSlice.openedModal).toBe('search');
});
it('shows an API error instead of reporting no matching results', async () => {
    http.get.mockRejectedValue(new Error('offline')); mount();
    fireEvent.change(screen.getByPlaceholderText('Search accounts or posts'), { target: { value: 'owner' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Search failed');
    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
});
it('ignores an old response after the query changes', async () => {
    let resolveOld: (result: unknown) => void = () => {};
    http.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    http.get.mockResolvedValue({ data: { users: [], postsList: [], pagination: { totalPages: 0 } } });
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
    const input = screen.getByPlaceholderText('Search accounts or posts');
    fireEvent.change(input, { target: { value: 'old' } });
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: 'new' } });
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    resolveOld({ data: { users: [], postsList: [{ _id: 'stale', caption: 'Stale post', userId: { username: 'owner' } }], pagination: { totalPages: 1 } } });
    await screen.findByText('No results found.');
    expect(screen.queryByText('Stale post')).not.toBeInTheDocument();
});

it('moves focus to search and closes the panel with Escape', () => {
    mount();
    const input = screen.getByPlaceholderText('Search accounts or posts');
    expect(input).toHaveFocus();
    expect(screen.getByRole('complementary', { name: 'Search' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Search' })).not.toBeInTheDocument();
});

it('closes the panel from its close button', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
    expect(screen.queryByPlaceholderText('Search accounts or posts')).not.toBeInTheDocument();
});
