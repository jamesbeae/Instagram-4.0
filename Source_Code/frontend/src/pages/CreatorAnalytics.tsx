import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faVideo } from '@fortawesome/free-solid-svg-icons';
import usePrivateHttp from '../hooks/usePrivateHttp';
import Button from '../components/UI/Button/Button';
import Input from '../components/UI/Input/Input';
import Loading from '../components/UI/Loading';
import SelectField from '../components/UI/SelectField';
import type { PhotoVideo } from '../models/PhotoVideo';
import './CreatorAnalytics.css';

const metrics = [
    ['views', 'Views'],
    ['likes', 'Likes'],
    ['comments', 'Comments'],
    ['saves', 'Saves'],
    ['shares', 'Shares'],
] as const;
const summaryMetrics = metrics.slice(0, 3);
const numberFormat = new Intl.NumberFormat();

type Counts = Record<typeof metrics[number][0], number>;
type Content = { id: string; caption: string | null };
type AnalyticsPost = Content & Counts & { preview?: Pick<PhotoVideo, 'url' | 'type'> | null };
type Analytics = { posts: AnalyticsPost[]; availablePosts: Content[] };
type Filters = { from?: string; to?: string; postId?: string };

const title = (post: Content) => post.caption?.trim() || 'Untitled post';

function AnalyticsPostCard({ post }: { post: AnalyticsPost }) {
    const [previewFailed, setPreviewFailed] = useState(false);
    const preview = post.preview;
    return (
        <li className="creator-analytics-post">
            <div className="creator-analytics-post-heading">
                {preview?.type === 'PHOTO' && !previewFailed ? (
                    <img className="creator-analytics-preview" src={preview.url} alt="" loading="lazy" onError={() => setPreviewFailed(true)} />
                ) : (
                    <span className="creator-analytics-preview" aria-hidden="true">
                        <FontAwesomeIcon icon={preview?.type === 'VIDEO' ? faVideo : faImage} />
                    </span>
                )}
                <h3>{title(post)}</h3>
            </div>
            <dl className="creator-analytics-metrics">
                {metrics.map(([key, label]) => (
                    <div key={key}><dt>{label}</dt><dd>{numberFormat.format(post[key])}</dd></div>
                ))}
            </dl>
        </li>
    );
}

function errorMessage(error: unknown, fallback: string) {
    return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;
}

export default function CreatorAnalytics() {
    const http = usePrivateHttp();
    const [data, setData] = useState<Analytics>();
    const [filters, setFilters] = useState<Filters>({});
    const [postId, setPostId] = useState('');
    const [dateReset, setDateReset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [canEnable, setCanEnable] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        void http.get<Analytics>('/creator/analytics', { params: filters, signal: controller.signal })
            .then(({ data: result }) => {
                if (controller.signal.aborted) return;
                setData(result);
                setCanEnable(false);
            })
            .catch((reason: unknown) => {
                if (controller.signal.aborted) return;
                if (isAxiosError(reason) && reason.response?.status === 403) {
                    setData(undefined);
                    setCanEnable(true);
                } else {
                    setError(errorMessage(reason, 'Unable to load analytics.'));
                }
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [filters, http]);

    const enableCreator = async () => {
        setEnabling(true);
        setError('');
        try {
            await http.post('/user/become-creator');
            setCanEnable(false);
            setFilters({});
        } catch (reason) {
            setError(errorMessage(reason, 'Unable to enable your creator account.'));
        } finally {
            setEnabling(false);
        }
    };

    return (
        <main className="creator-analytics">
            <div className="creator-analytics-content">
                <h1>Creator Analytics</h1>
                {canEnable && (
                    <Button variant="primary" className="creator-analytics-button" onClick={() => void enableCreator()} disabled={enabling}>
                        {enabling ? 'Enabling…' : 'Enable creator account'}
                    </Button>
                )}
                {data && (
                    <form className="creator-analytics-filters" aria-label="Filter creator analytics" onSubmit={event => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        const from = String(form.get('from') || '');
                        const to = String(form.get('to') || '');
                        if (from && to && from > to) {
                            setError('Choose an end date on or after the start date.');
                            return;
                        }
                        setFilters({ from: from || undefined, to: to || undefined, postId: postId || undefined });
                    }}>
                        <label key={`from-${dateReset}`}>From<Input type="date" name="from" disabled={loading} /></label>
                        <label key={`to-${dateReset}`}>To<Input type="date" name="to" disabled={loading} /></label>
                        <SelectField label="Content" value={postId} onChange={setPostId} disabled={loading}
                            options={[{ value: '', label: 'All content' }, ...data.availablePosts.map(post => ({ value: post.id, label: title(post) }))]} />
                        <Button className="creator-analytics-button" type="submit" variant="primary" disabled={loading}>Apply filters</Button>
                        <Button className="creator-analytics-button creator-analytics-clear" disabled={loading} onClick={() => {
                            setDateReset(current => current + 1);
                            setPostId('');
                            setFilters({});
                        }}>Clear filters</Button>
                    </form>
                )}
                {error && <p role="alert" className="creator-analytics-error">{error}</p>}
                {!data && error && !canEnable && (
                    <Button variant="primary" className="creator-analytics-button" onClick={() => setFilters({ ...filters })}>Try again</Button>
                )}
                {loading && <Loading message="Loading analytics…" align="start" />}
                {data && (
                    <div className="creator-analytics-results" aria-busy={loading}>
                        <dl className="creator-analytics-summary" aria-label="Analytics overview">
                            {summaryMetrics.map(([key, label]) => (
                                <div key={key}>
                                    <dt>{label}</dt>
                                    <dd>{numberFormat.format(data.posts.reduce((sum, post) => sum + post[key], 0))}</dd>
                                </div>
                            ))}
                        </dl>
                        <section className="creator-analytics-performance" aria-labelledby="creator-analytics-performance-title">
                            <h2 id="creator-analytics-performance-title">Content performance</h2>
                            {data.posts.length ? (
                                <ul className="creator-analytics-list" role="list">
                                    {data.posts.map(post => <AnalyticsPostCard key={post.id} post={post} />)}
                                </ul>
                            ) : (
                                <p role="status">No statistics match these filters.</p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
