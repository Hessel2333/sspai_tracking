import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import StatsChart from '../components/StatsChart';
import dayjs from 'dayjs';

export default function Home({ history, latest, latestTimestamp }) {
    // latest.totals holds the aggregate
    // latest.articles holds the array of articles

    const totals = latest.totals || latest; // Fallback for old format if any

    return (
        <div className="min-h-screen">
            <Head>
                <title>SSPAI Tracker</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="container">
                <header>
                    <div>
                        <h1>SSPAI Tracker</h1>
                        <p className="subtitle">
                            Tracking <strong className="text-primary">{totals.article_count || 0}</strong> articles.
                            Last updated: {dayjs(latestTimestamp).format('YYYY-MM-DD HH:mm')}
                        </p>
                    </div>
                    <a href="https://github.com/Hessel2333/sspai_tracking" target="_blank" className="article-link" style={{ fontSize: 14 }}>
                        GitHub ↗
                    </a>
                </header>

                {/* --- Summary Cards --- */}
                <div className="grid">
                    <Card title="Total Views" value={totals.views || totals.total_views} icon="👀" />
                    <Card title="Total Likes" value={totals.likes || totals.total_likes} icon="❤️" />
                    <Card title="Total Comments" value={totals.comments || totals.total_comments} icon="💬" />
                </div>

                {/* --- Chart --- */}
                <div className="section">
                    <div className="section-header">
                        <span className="card-title">Total Views Trend</span>
                    </div>
                    <div style={{ padding: 24 }}>
                        <StatsChart history={history} title="Total Views" dataKey={Object.keys(totals).includes('views') ? 'totals.views' : 'total_views'} />
                    </div>
                </div>

                {/* --- Article List --- */}
                <div className="section">
                    <div className="section-header">
                        <h2>Tracked Articles</h2>
                    </div>
                    {latest.articles && latest.articles.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th className="text-right">Views</th>
                                        <th className="text-right">Likes</th>
                                        <th className="text-right">Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {latest.articles.sort((a, b) => b.views - a.views).map(article => (
                                        <tr key={article.id}>
                                            <td>
                                                <Link href={`/post/${article.id}`} className="article-link">
                                                    {article.title}
                                                </Link>
                                                <span className="meta-text">{dayjs.unix(article.created_at).format('YYYY-MM-DD')}</span>
                                            </td>
                                            <td className="stat-cell">{article.views.toLocaleString()}</td>
                                            <td className="stat-cell">{article.likes.toLocaleString()}</td>
                                            <td className="stat-cell">{article.comments.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>No article details available yet.</div>
                    )}
                </div>
            </main>
        </div>
    );
}

function Card({ title, value, icon }) {
    return (
        <div className="card">
            <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="card-title">{title}</span>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                </div>
                <p className="card-value">{value ? value.toLocaleString() : 0}</p>
            </div>
        </div>
    );
}

export async function getStaticProps() {
    const dataDir = path.join(process.cwd(), 'data');
    const historyPath = path.join(dataDir, 'history.json');

    // Read history file at build time
    let history = [];
    try {
        const fileContent = fs.readFileSync(historyPath, 'utf8');
        history = JSON.parse(fileContent);
    } catch (e) {
        console.error('Error reading history file:', e);
    }

    const latest = history.length > 0 ? history[history.length - 1] : {};

    return {
        props: {
            history,
            latest,
            latestTimestamp: latest.timestamp || null,
        },
        // Add revalidate if you want ISR, but for this git-trigger model, simple SSG is fine.
    };
}
