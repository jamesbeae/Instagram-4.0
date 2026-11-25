import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError, type AxiosInstance } from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRightFromBracket, faChartColumn, faFlag, faImages, faListCheck, faShieldHalved, faUsers } from "@fortawesome/free-solid-svg-icons";
import { useConfirmDiscard, useUnsavedChanges } from "../components/UnsavedChanges";
import Avatar from "../components/UI/Avatar/Avatar";
import Button from "../components/UI/Button/Button";
import Card from "../components/UI/Card";
import Input from "../components/UI/Input/Input";
import Loading from "../components/UI/Loading";
import SelectField from "../components/UI/SelectField";
import usePrivateHttp from "../hooks/usePrivateHttp";
import { useAppDispatch, useAppSelector } from "../hooks/useStore";
import { authActions } from "../lib/redux/authSlice";
import type { Post } from "../models/Post";
import { logout } from "../services/logoutService";
import "./AdminDashboard.css";

const sections = [
    { id: "overview", title: "Overview", icon: faChartColumn },
    { id: "reports", title: "Reports", icon: faFlag },
    { id: "content", title: "Content", icon: faImages },
    { id: "accounts", title: "Accounts", icon: faUsers },
    { id: "activity", title: "Activity log", icon: faListCheck },
] as const;
type Section = typeof sections[number]["id"];
const metrics = [
    { id: "accounts", title: "Accounts", icon: faUsers, items: [["users", "Total accounts"], ["activeUsers", "Active"], ["disabledUsers", "Disabled"]] },
    { id: "content", title: "Content", icon: faImages, items: [["posts", "Posts"], ["stories", "Stories"], ["reels", "Reels"]] },
    { id: "reports", title: "Reports", icon: faFlag, items: [["openReports", "Open"], ["resolvedReports", "Resolved"]] },
    { id: "interactions", title: "Interactions", icon: faChartColumn, items: [["follows", "Follows"], ["likes", "Likes"], ["comments", "Comments"], ["saves", "Saves"], ["behaviorEvents", "Behavior events"]] },
] as const;
const featuredMetrics = [
    { key: "users", label: "Total accounts", icon: faUsers },
    { key: "posts", label: "Posts", icon: faImages },
    { key: "openReports", label: "Open reports", icon: faFlag },
] as const;
const defaultStats = { from: "", to: "", category: "all" };
const defaultContent = { q: "", kind: "all", status: "all", page: 1 };
const roleOptions = ["user", "creator", "admin"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const kindOptions = [{ value: "all", label: "All types" }, ...["POST", "STORY", "REEL"].map(value => ({ value, label: value[0] + value.slice(1).toLowerCase() }))];
const visibilityOptions = ["all", "visible", "hidden"].map(value => ({ value, label: value === "all" ? "Any status" : value[0].toUpperCase() + value.slice(1) }));
type Stats = Record<typeof metrics[number]["items"][number][0], number>;
type Report = { id: string; reason: string; status: string; postId?: string; targetUserId?: string; createdAt: string };
type Account = { _id: string; username: string; fullName: string; avatar?: string; role: string; disabled: boolean };
type AdminPost = Post & { hidden: boolean };
type Activity = { id: string; action: string; admin?: { username: string }; adminId: string; targetUser?: { username: string }; targetUserId?: string; reportId?: string; createdAt: string; details?: { resolution?: string; decision?: string; postId?: string; role?: string; disabled?: boolean } };

const numberFormat = new Intl.NumberFormat();

function OverviewMetrics({ stats, category }: { stats: Stats; category: string }) {
    const groups = metrics.filter(group => category === "all" || category === group.id);

    return (
        <>
            {category === "all" && (
                <section className="admin-overview-summary" aria-label="Key metrics">
                    {featuredMetrics.map(({ key, label, icon }) => (
                        <Card key={key} className="admin-panel admin-overview-kpi">
                            <span className="admin-overview-icon"><FontAwesomeIcon icon={icon} aria-hidden="true" /></span>
                            <dl>
                                <dt>{label}</dt>
                                <dd>{numberFormat.format(stats[key])}</dd>
                            </dl>
                        </Card>
                    ))}
                </section>
            )}
            <div className="admin-overview-grid" data-filtered={category !== "all"}>
                {groups.map(group => (
                    <Card as="section" key={group.id} className="admin-panel admin-overview-group">
                        <h2><FontAwesomeIcon icon={group.icon} aria-hidden="true" />{group.title}</h2>
                        <dl className="admin-metrics">
                            {group.items.map(([key, label]) => (
                                <div key={key}><dt>{label}</dt><dd>{numberFormat.format(stats[key])}</dd></div>
                            ))}
                        </dl>
                    </Card>
                ))}
            </div>
        </>
    );
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const actionNames: Record<string, string> = {
    RESOLVE_REPORT: "Resolved report", MODERATE_CONTENT: "Moderated content", UPDATE_USER: "Updated account", BOOTSTRAP_ADMIN: "Created first admin",
    open: "Open", dismiss: "Dismissed", "hide-post": "Content hidden", "disable-user": "Account disabled", hide: "Hidden", keep: "Restored",
};
const showAction = (value: string) => actionNames[value] ?? value.replace(/_/g, " ");
function errorMessage(error: unknown, fallback: string) {
    return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;
}

function useAdminQuery<T>(http: AxiosInstance, endpoint: string, active: boolean, revision: number, params?: object) {
    const [result, setResult] = useState<{ params?: object; data?: T; pending: boolean; error: string }>({ pending: true, error: "" });
    useEffect(() => {
        if (!active) return;
        const controller = new AbortController();
        setResult(previous => ({ params, data: previous.params === params ? previous.data : undefined, pending: true, error: "" }));
        void http.get<T>(endpoint, { params, signal: controller.signal }).then(response => {
            if (!controller.signal.aborted) setResult({ params, data: response.data, pending: false, error: "" });
        }).catch(reason => {
            if (!controller.signal.aborted) setResult(previous => ({ ...previous, pending: false, error: errorMessage(reason, "Unable to load this section.") }));
        });
        return () => controller.abort();
    }, [active, endpoint, http, params, revision]);
    return result.params === params ? result : { data: undefined, pending: true, error: "" };
}

export default function AdminDashboard() {
    const http = usePrivateHttp();
    const [section, setSection] = useState<Section>("overview");
    const [revision, setRevision] = useState(0);
    const [statsDraft, setStatsDraft] = useState(defaultStats);
    const [statsFilters, setStatsFilters] = useState(defaultStats);
    const [contentDraft, setContentDraft] = useState(defaultContent);
    const [contentFilters, setContentFilters] = useState(defaultContent);
    const [reportFilter, setReportFilter] = useState("open");
    const [accountQuery, setAccountQuery] = useState("");
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState("");
    const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
    const mainRef = useRef<HTMLElement>(null);
    const statsParams = useMemo(() => ({
        category: statsFilters.category, ...(statsFilters.from && { from: statsFilters.from }), ...(statsFilters.to && { to: statsFilters.to }),
    }), [statsFilters]);
    const stats = useAdminQuery<Stats>(http, "/admin/stats", section === "overview", revision, statsParams);
    const reports = useAdminQuery<{ reports: Report[] }>(http, "/admin/reports", section === "reports", revision);
    const content = useAdminQuery<{ postsList: AdminPost[]; pagination: { page: number; totalPages: number; total: number } }>(http, "/admin/content", section === "content", revision, contentFilters);
    const accounts = useAdminQuery<{ users: Account[] }>(http, "/admin/users", section === "accounts", revision);
    const activity = useAdminQuery<{ actions: Activity[] }>(http, "/admin/actions", section === "activity", revision);
    const requests = { overview: stats, reports, content, accounts, activity };
    const current = requests[section];
    const user = useAppSelector(state => state.authSlice.userInfo);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const confirmDiscard = useConfirmDiscard();
    useUnsavedChanges(Object.values(notes).some(note => Boolean(note.trim())), () => setNotes({}));

    useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [section]);

    async function update(id: string, url: string, payload: object, message: string) {
        if (busy) return;
        setBusy(id);
        setFeedback(undefined);
        try {
            await http.patch(url, payload);
            setNotes(previous => ({ ...previous, [id]: "" }));
            setRevision(value => value + 1);
            setFeedback({ text: message });
        } catch (error) {
            setFeedback({ text: errorMessage(error, "Unable to complete this action."), error: true });
        } finally {
            setBusy("");
        }
    }

    async function signOut() {
        const result = await logout(http);
        if (!result.success) {
            setFeedback({ text: result.message, error: true });
            return;
        }
        dispatch(authActions.loggedOut());
        navigate("/admin/login", { replace: true });
    }

    function viewReportedContent(id: string) {
        const next = { ...defaultContent, q: id };
        setContentDraft(next);
        setContentFilters(next);
        setFeedback(undefined);
        setSection("content");
    }

    function decision(id: string, action: string, url: string, message: string) {
        void update(id, url, { action, resolution: notes[id]?.trim() }, message);
    }

    function decisionNote(id: string, label: string) {
        return <label className="admin-field">{label}
            <textarea className="admin-input" value={notes[id] || ""} maxLength={1000} rows={2}
                placeholder="At least 5 characters" disabled={busy === id}
                onChange={event => setNotes(previous => ({ ...previous, [id]: event.target.value }))} />
        </label>;
    }

    function toolbar(submit: (event: FormEvent<HTMLFormElement>) => void, children: ReactNode) {
        return <form className="admin-toolbar" onSubmit={submit}>{children}</form>;
    }

    const canDecide = (id: string) => !busy && !current.pending && (notes[id] || "").trim().length >= 5;
    const visibleReports = reports.data?.reports.filter(item => reportFilter === "all" || (reportFilter === "open" ? item.status === "open" : item.status !== "open")) ?? [];
    const visibleAccounts = accounts.data?.users.filter(item => `${item.username} ${item.fullName}`.toLowerCase().includes(accountQuery.trim().toLowerCase())) ?? [];
    const pagination = content.data?.pagination;
    const currentTitle = sections.find(item => item.id === section)?.title;

    return (
        <div className="admin-dashboard">
            <aside className="admin-sidebar" aria-label="Admin workspace">
                <div className="admin-brand"><span className="admin-brand-icon"><FontAwesomeIcon icon={faShieldHalved} /></span><strong>Administration</strong></div>
                <nav className="admin-nav" aria-label="Admin sections">
                    {sections.map(item => <Button key={item.id} className="admin-nav-item" aria-current={section === item.id ? "page" : undefined}
                        onClick={() => { setSection(item.id); setFeedback(undefined); }}>
                        <FontAwesomeIcon icon={item.icon} aria-hidden="true" />{item.title}
                    </Button>)}
                </nav>
                <div className="admin-sidebar-footer">
                    <Link to="/" className="admin-nav-item"><FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />Back to app</Link>
                    <Button className="admin-nav-item" onClick={() => confirmDiscard(() => void signOut())}>
                        <FontAwesomeIcon icon={faArrowRightFromBracket} aria-hidden="true" />Log out
                    </Button>
                </div>
            </aside>

            <main ref={mainRef} className="admin-main">
                <header className="admin-header">
                    <h1>{currentTitle}</h1>
                    <Link to="/settings" className="admin-identity" aria-label="Account settings">
                        <Avatar className="h-9 w-9 shrink-0" avatarUrl={user?.avatar} username={user?.username} />
                        <span><strong>{user?.username || "Admin"}</strong><small>Administrator</small></span>
                    </Link>
                </header>
                {feedback && <p className="admin-feedback" role={feedback.error ? "alert" : "status"} data-error={Boolean(feedback.error)}>{feedback.text}</p>}
                {current.error && <p className="admin-feedback" role="alert" data-error="true">{current.error} <Button className="admin-button" onClick={() => setRevision(value => value + 1)}>Retry</Button></p>}

                {section === "overview" && <>
                    {toolbar(event => { event.preventDefault(); setStatsFilters({ ...statsDraft }); }, <>
                        <label className="admin-field">From<input className="admin-input" type="date" value={statsDraft.from} onChange={event => setStatsDraft({ ...statsDraft, from: event.target.value })} /></label>
                        <label className="admin-field">To<input className="admin-input" type="date" value={statsDraft.to} onChange={event => setStatsDraft({ ...statsDraft, to: event.target.value })} /></label>
                        <SelectField label="Category" value={statsDraft.category} options={[{ value: "all", label: "All categories" }, ...metrics.map(group => ({ value: group.id, label: group.title }))]} onChange={category => setStatsDraft({ ...statsDraft, category })} />
                        <Button className="admin-button primary" type="submit">Apply filters</Button>
                        <Button className="admin-button" onClick={() => { setStatsDraft(defaultStats); setStatsFilters({ ...defaultStats }); }}>Clear</Button>
                    </>)}
                    {stats.data && <OverviewMetrics stats={stats.data} category={statsFilters.category} />}
                </>}

                {section === "reports" && <Card as="section" className="admin-panel">
                    <div className="admin-section-heading"><h2>Report queue</h2>
                        <SelectField label="Status" value={reportFilter} onChange={setReportFilter}
                            options={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "all", label: "All reports" }]} />
                    </div>
                    {visibleReports.map(report => <article className="admin-list-row" key={report.id}>
                        <div className="admin-row-meta"><span className="admin-chip" data-state={report.status}>{showAction(report.status)}</span>
                            <time dateTime={report.createdAt}>{dateFormat.format(new Date(report.createdAt))}</time>
                        </div>
                        <h3>{report.reason}</h3>
                        <div className="admin-row-actions">
                            {report.postId && <Button className="admin-button" onClick={() => viewReportedContent(report.postId!)}>View content</Button>}
                            {report.targetUserId && <Link className="admin-button" to={`/profile/${report.targetUserId}`}>View account</Link>}
                        </div>
                        {report.status === "open" && <>
                            {decisionNote(report.id, "Resolution note")}
                            <div className="admin-row-actions">
                                <Button className="admin-button" disabled={!canDecide(report.id)} onClick={() => decision(report.id, "dismiss", `/admin/reports/${report.id}`, "Report dismissed.")}>Dismiss report</Button>
                                {report.postId && <Button className="admin-button danger" disabled={!canDecide(report.id)} onClick={() => decision(report.id, "hide-post", `/admin/reports/${report.id}`, "Reported content hidden.")}>Hide content</Button>}
                                {report.targetUserId && <Button className="admin-button danger" disabled={!canDecide(report.id) || report.targetUserId === user?._id} onClick={() => decision(report.id, "disable-user", `/admin/reports/${report.id}`, "Reported account disabled.")}>Disable account</Button>}
                            </div>
                        </>}
                    </article>)}
                    {!current.pending && !current.error && !visibleReports.length && <p className="admin-empty">No reports match this status.</p>}
                </Card>}

                {section === "content" && <Card as="section" className="admin-panel">
                    <h2>Content moderation</h2>
                    {toolbar(event => { event.preventDefault(); setContentFilters({ ...contentDraft, q: contentDraft.q.trim(), page: 1 }); }, <>
                        <label className="admin-field admin-search">Search by caption or ID
                            <Input key={contentFilters.q} className="admin-input" type="search" maxLength={120} defaultValue={contentDraft.q} getInputValueHandler={q => setContentDraft(previous => ({ ...previous, q }))} />
                        </label>
                        <SelectField label="Type" value={contentDraft.kind} options={kindOptions} onChange={kind => setContentDraft({ ...contentDraft, kind })} />
                        <SelectField label="Status" value={contentDraft.status} options={visibilityOptions} onChange={status => setContentDraft({ ...contentDraft, status })} />
                        <Button className="admin-button primary" type="submit">Search</Button>
                    </>)}
                    {content.data?.postsList.map(post => <article className="admin-list-row admin-content-row" key={post._id}>
                        <div className="admin-media">
                            {post.photoVideo?.map((media, index) => media.type === "VIDEO"
                                ? <video key={media._id || index} src={media.url} controls preload="none" />
                                : <img key={media._id || index} src={media.url} loading="lazy" alt={`Media ${index + 1} under review`} />)}
                        </div>
                        <div className="admin-content-detail">
                            <div className="admin-row-meta"><span className="admin-chip" data-state={post.hidden ? "hidden" : "active"}>{post.hidden ? "Hidden" : "Visible"}</span><span>{post.kind}</span></div>
                            <h3>{post.userId?.username || "Unknown account"}</h3>
                            {post.caption && <p className="admin-caption">{post.caption}</p>}
                            <p className="admin-id">{post._id}</p>
                            {decisionNote(post._id, "Decision note")}
                            <Button className={`admin-button ${post.hidden ? "" : "danger"}`} disabled={!canDecide(post._id)}
                                onClick={() => decision(post._id, post.hidden ? "keep" : "hide", `/admin/content/${post._id}/moderate`, post.hidden ? "Content restored." : "Content hidden.")}>
                                {post.hidden ? "Restore visibility" : "Hide content"}
                            </Button>
                        </div>
                    </article>)}
                    {!current.pending && !current.error && !content.data?.postsList.length && <p className="admin-empty">No content matches these filters.</p>}
                    {pagination && (contentFilters.page > 1 || pagination.totalPages > 1) && <div className="admin-pager">
                        <Button className="admin-button" disabled={current.pending || contentFilters.page <= 1} onClick={() => setContentFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</Button>
                        <span>Page {contentFilters.page} of {Math.max(contentFilters.page, pagination.totalPages)}</span>
                        <Button className="admin-button" disabled={current.pending || contentFilters.page >= pagination.totalPages} onClick={() => setContentFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Next</Button>
                    </div>}
                </Card>}

                {section === "accounts" && <Card as="section" className="admin-panel">
                    <div className="admin-section-heading"><h2>Account management</h2>
                        <Input className="admin-input" type="search" placeholder="Search accounts" aria-label="Search accounts" defaultValue={accountQuery} getInputValueHandler={setAccountQuery} />
                    </div>
                    {visibleAccounts.map(account => <div className="admin-list-row admin-account-row" key={account._id}>
                        <Link className="admin-identity" to={`/profile/${account._id}`}>
                            <Avatar className="h-10 w-10 shrink-0" avatarUrl={account.avatar} username={account.username} />
                            <span><strong>{account.fullName || account.username}</strong><small>@{account.username}</small></span>
                        </Link>
                        <span className="admin-chip" data-state={account.disabled ? "hidden" : "active"}>{account.disabled ? "Disabled" : "Active"}</span>
                        {account._id === user?._id ? <span className="admin-id">Your account · Admin</span> : <div className="admin-row-actions admin-account-actions">
                            <SelectField label="Role" aria-label={`Role for ${account.username}`} value={account.role} options={roleOptions} disabled={Boolean(busy)}
                                onChange={role => void update(account._id, `/admin/users/${account._id}`, { role }, "Account role updated.")} />
                            <Button className={`admin-button ${account.disabled ? "" : "danger"}`} disabled={Boolean(busy)} onClick={() => void update(account._id, `/admin/users/${account._id}`, { disabled: !account.disabled }, account.disabled ? "Account enabled." : "Account disabled.")}>
                                {account.disabled ? "Enable" : "Disable"}
                            </Button>
                        </div>}
                    </div>)}
                    {!current.pending && !current.error && !visibleAccounts.length && <p className="admin-empty">No matching accounts.</p>}
                </Card>}

                {section === "activity" && <Card as="section" className="admin-panel">
                    <h2>Recent admin actions</h2>
                    {activity.data?.actions.map(action => <article className="admin-list-row" key={action.id}>
                        <div className="admin-row-meta"><time dateTime={action.createdAt}>{dateFormat.format(new Date(action.createdAt))}</time></div>
                        <h3>{showAction(action.action)}</h3>
                        <p className="admin-id">{action.admin?.username || action.adminId} · {action.targetUser?.username || action.targetUserId || action.details?.postId || action.reportId || "System"}</p>
                        {action.details?.decision && <span className="admin-chip">{showAction(action.details.decision)}</span>}
                        {action.details?.resolution && <p className="admin-caption">{action.details.resolution}</p>}
                    </article>)}
                    {!current.pending && !current.error && !activity.data?.actions.length && <p className="admin-empty">No actions recorded yet.</p>}
                </Card>}
                {current.pending && <Loading message="Loading…" className="admin-loading" />}
            </main>
        </div>
    );
}
