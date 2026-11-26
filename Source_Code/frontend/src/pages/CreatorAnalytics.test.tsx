import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CreatorAnalytics from './CreatorAnalytics';

const http = { get: vi.fn(), post: vi.fn() };
vi.mock('../hooks/usePrivateHttp', () => ({ default: () => http }));

afterEach(() => {
    cleanup();
    http.get.mockReset();
    http.post.mockReset();
});

it('shows metric totals and individual post cards, with filters that can be cleared', async () => {
    const first = { id: '1', caption: 'First post', views: 30, likes: 6, comments: 3, saves: 2, shares: 1,
        preview: { type: 'PHOTO', url: '/photo.png' } };
    const second = { ...first, id: '2', caption: 'Second post', views: 12, preview: null };
    const availablePosts = [first, second];
    http.get.mockImplementation(async (_path, { params }) => ({
        data: { availablePosts, posts: params.postId ? [first] : availablePosts },
    }));
    render(<CreatorAnalytics />);

    const performance = within(await screen.findByRole('region', { name: 'Content performance' }));
    expect(performance.getAllByRole('listitem')).toHaveLength(2);
    const firstCard = performance.getByRole('heading', { name: 'First post' }).closest('li');
    expect(firstCard?.querySelector('img')).toHaveAttribute('src', '/photo.png');
    expect(within(firstCard!).getByText('Shares').nextElementSibling).toHaveTextContent('1');
    const overview = within(screen.getByLabelText('Analytics overview'));
    expect(overview.getByText('Views').nextElementSibling).toHaveTextContent('42');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-19' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an end date');
    expect(http.get).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-26' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(performance.getAllByRole('listitem')).toHaveLength(1));
    expect(http.get).toHaveBeenLastCalledWith('/creator/analytics', expect.objectContaining({
        params: { from: '2026-11-20', to: '2026-11-26', postId: '1' },
    }));
    expect(overview.getByText('Views').nextElementSibling).toHaveTextContent('30');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(performance.getAllByRole('listitem')).toHaveLength(2));
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.getByLabelText('To')).toHaveValue('');
    expect(screen.getByLabelText('Content')).toHaveValue('');
});

it('lets an ordinary user enable creator analytics and then loads their data', async () => {
    http.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
        .mockResolvedValueOnce({ data: { availablePosts: [], posts: [] } });
    http.post.mockResolvedValueOnce({});
    render(<CreatorAnalytics />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable creator account' }));
    expect(await screen.findByText('No statistics match these filters.')).toBeVisible();
    expect(http.post).toHaveBeenCalledWith('/user/become-creator');
    expect(screen.queryByRole('button', { name: 'Enable creator account' })).not.toBeInTheDocument();
});
