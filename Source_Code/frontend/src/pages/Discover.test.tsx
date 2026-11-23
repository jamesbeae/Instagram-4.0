import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import PostDetailModal from '../components/PostDetailModal';
import postDetailModalSlice from '../lib/redux/postDetailModalSlice';
import { afterEach, expect, it, vi } from 'vitest';
import type { Post } from '../models/Post';
import Discover from './Discover';

vi.mock('../components/PostDetailModal/PostDescription', () => ({ default: () => null }));
vi.mock('../components/UI/VideoPhotoSwiper', () => ({ default: () => null }));

function renderExplore() {
    const store = configureStore({
        reducer: { postDetailModalSlice: postDetailModalSlice.reducer, postsListSlice: () => [] as Post[], authSlice: () => ({ userInfo: { _id: "viewer" } }) },
    });
    type State = ReturnType<typeof store.getState>;
    function Page() {
        const { isOpen } = useSelector((state: State) => state.postDetailModalSlice);
        const { pathname } = useLocation();
        return <>
            <output aria-label="Current path">{pathname}</output>
            {isOpen && <PostDetailModal />}
            <Discover />
        </>;
    }
    return render(<Provider store={store}><MemoryRouter initialEntries={['/explore']}><Page /></MemoryRouter></Provider>);
}

const http = { get: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));

afterEach(() => {
    cleanup();
    http.get.mockReset();
});

function post(index: number, type: 'PHOTO' | 'VIDEO' = 'PHOTO'): Post {
    return {
        _id: `${index}`,
        caption: `Post ${index}`,
        userId: { _id: 'author', username: 'author', email: '', fullName: 'Author', bio: null, avatar: null },
        photoVideo: [{ url: `/${index}.media`, type }],
        likes: [],
        comments: [],
    };
}

function measure(element: Element, width: number, height: number) {
    if (element.tagName === 'VIDEO') {
        Object.defineProperties(element, { videoWidth: { value: width }, videoHeight: { value: height } });
        fireEvent.loadedMetadata(element);
    } else {
        Object.defineProperties(element, { naturalWidth: { value: width }, naturalHeight: { value: height } });
        fireEvent.load(element);
    }
}

it('alternates full groups of five across pages and features portrait media of either type', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => post(index + 1, index === 0 || index === 6 ? 'VIDEO' : 'PHOTO'));
    const secondPage = Array.from({ length: 6 }, (_, index) => post(index + 11));
    http.get.mockResolvedValueOnce({ data: { postsList: firstPage, pagination: { totalPages: 2 } } });
    http.get.mockResolvedValueOnce({ data: { postsList: secondPage, pagination: { totalPages: 2 } } });

    const { container } = renderExplore();
    await screen.findByRole('link', { name: /Post 10,/ });
    expect(http.get).toHaveBeenLastCalledWith('/post/explore', expect.objectContaining({ params: { page: 1, limit: 10 } }));
    const media = (id: number) => screen.getByRole('link', { name: new RegExp(`Post ${id},`) }).querySelector('img, video')!;
    measure(media(2), 800, 1400);
    measure(media(1), 1600, 900);
    measure(media(6), 900, 900);
    measure(media(7), 900, 1600);

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByRole('link', { name: /Post 16,/ });
    expect(http.get).toHaveBeenLastCalledWith('/post/explore', expect.objectContaining({ params: { page: 2, limit: 10 } }));
    measure(media(11), 700, 1100);
    measure(media(16), 700, 1100);

    const groups = [...container.querySelectorAll<HTMLElement>('.explore-group')];
    expect(groups.map(group => group.dataset.side)).toEqual(['right', 'left', 'right', 'left']);
    expect(groups.map(group => within(group).getAllByRole('link').length)).toEqual([5, 5, 5, 1]);
    expect(groups.map(group => group.querySelector('[data-featured="true"]')?.getAttribute('href')))
        .toEqual(['/post/2', '/post/7', '/post/11', undefined]);
    expect(screen.getByRole('link', { name: 'Post 2, 0 likes, 0 comments' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

it('keeps a group on the square grid when its covers are all landscape or square', async () => {
    const posts = Array.from({ length: 5 }, (_, index) => post(index + 1));
    http.get.mockResolvedValue({ data: { postsList: posts, pagination: { totalPages: 1 } } });
    const { container } = renderExplore();
    await screen.findByRole('link', { name: /Post 5,/ });
    container.querySelectorAll('.explore-tile img').forEach(image => measure(image, 1200, 900));
    expect(container.querySelector('[data-featured="true"]')).not.toBeInTheDocument();
});

it('opens the shared post dialog over Explore and returns focus to the selected post on Escape', async () => {
    http.get.mockResolvedValue({ data: { postsList: [post(1)], pagination: { totalPages: 1 } } });
    renderExplore();
    const tile = await screen.findByRole('link', { name: /Post 1,/ });
    tile.focus();

    fireEvent.click(tile);
    const dialog = await screen.findByRole('dialog', { name: 'Post details' });
    expect(dialog).toHaveFocus();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/explore');
    expect(tile).toBeInTheDocument();
    expect(tile).toHaveAttribute('href', '/post/1');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(tile).toHaveFocus());
});
