import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Suggested from './Suggested';

const { getSuggestedUsersMock, mockHttp } = vi.hoisted(() => ({ getSuggestedUsersMock: vi.fn(), mockHttp: {} }));

vi.mock('../../../services/userService', () => ({
    getSuggestedUsers: getSuggestedUsersMock,
    createFollow: vi.fn(),
    deleteFollow: vi.fn(),
}));
vi.mock('../../../hooks/usePrivateHttp', () => ({ default: () => mockHttp }));
vi.mock('../../../components/UI/UserTagBar', () => ({ default: () => null }));

beforeEach(() => {
    vi.resetAllMocks();
});
afterEach(cleanup);

describe('suggested users loading states', () => {
    it('shows an empty state only after a successful empty response', async () => {
        getSuggestedUsersMock.mockResolvedValue({ data: { users: [] } });

        render(<Suggested />);

        expect(await screen.findByText('No suggested users')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('shows a load error separately and retries successfully', async () => {
        getSuggestedUsersMock
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ data: { users: [] } });

        render(<Suggested />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load suggestions.');
        expect(screen.queryByText('No suggested users')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(await screen.findByText('No suggested users')).toBeInTheDocument();
        await waitFor(() => expect(getSuggestedUsersMock).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
