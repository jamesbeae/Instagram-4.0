import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, it, expect, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import sideBarSlice, { sideBarActions } from '../../../lib/redux/sideBarSlice';
import SearchModal from './index';
const http = { get: vi.fn() };
vi.mock('../../../hooks/usePrivateHttp', () => ({ default: () => http }));
const mount = () => {
    const store = configureStore({ reducer: { sideBarSlice: sideBarSlice.reducer } });
    store.dispatch(sideBarActions.openModal('search'));
    render(<Provider store={store}><MemoryRouter><SearchModal /></MemoryRouter></Provider>);
};
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
it('searches posts and links the result to its detail page', async () => {
    http.get.mockResolvedValue({ data: { users: [], postsList: [{ _id: 'post-id', caption: 'A searchable post', userId: { username: 'owner' } }], pagination: { totalPages: 1 } } });
    mount(); fireEvent.click(screen.getByRole('tab', { name: 'Posts' }));
    fireEvent.change(screen.getByPlaceholderText('Search accounts or posts'), { target: { value: 'searchable' } });
    expect(await screen.findByRole('link', { name: /A searchable post/ })).toHaveAttribute('href', '/post/post-id');
    expect(http.get.mock.calls[0][1].params.scope).toBe('posts');
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
    mount(); fireEvent.click(screen.getByRole('tab', { name: 'Posts' }));
    const input = screen.getByPlaceholderText('Search accounts or posts');
    fireEvent.change(input, { target: { value: 'old' } });
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: 'new' } });
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    resolveOld({ data: { users: [], postsList: [{ _id: 'stale', caption: 'Stale post', userId: { username: 'owner' } }], pagination: { totalPages: 1 } } });
    await screen.findByText('No results found.');
    expect(screen.queryByText('Stale post')).not.toBeInTheDocument();
});
