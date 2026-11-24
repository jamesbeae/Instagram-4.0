import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../hooks/useStore";

export default function TopicsCard() {
    const posts = useAppSelector((state) => state.postsListSlice);
    const navigate = useNavigate();
    const topics = useMemo(() => {
        const counts = new Map<string, number>();
        posts.forEach((post) => {
            const tags = post.caption?.match(/#[\p{L}\p{N}_]+/gu) || [];
            tags.forEach((tag) => {
                const normalized = tag.toLowerCase();
                counts.set(normalized, (counts.get(normalized) || 0) + 1);
            });
        });
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [posts]);

    return <section className="home-topics-card">
        <div className="home-panel-heading"><h2>Trending topics</h2><button type="button" onClick={() => navigate("/explore")}>Explore</button></div>
        {topics.length ? <ul>{topics.map(([topic, count]) => <li key={topic}>
            <button type="button" onClick={() => navigate(`/explore?topic=${encodeURIComponent(topic.slice(1))}`)}><strong>{topic}</strong><span>{count} posts in your feed</span></button>
        </li>)}</ul> : <div className="home-topics-empty"><p>No trending topics yet.</p><button type="button" onClick={() => navigate("/explore")}>Explore posts</button></div>}
    </section>;
}
