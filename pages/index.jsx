import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import StatsChart from '../components/StatsChart';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home({ history, latest, latestTimestamp }) {
    const { t, toggleLang, lang } = useLanguage();
    const totals = latest.totals || latest;

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'views', direction: 'desc' });

    // Sorting Logic
    const sortedArticles = [...(latest.articles || [])].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span style={{ opacity: 0.2, marginLeft: 4 }}>⇅</span>;
        return <span style={{ marginLeft: 4 }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className="min-h-screen">
            <Head>
                <title>{t('title')}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="container">
                <header>
                    <div>
                        <h1>{t('title')}</h1>
                        <p className="subtitle">
                            {t('subtitle')} <strong className="text-primary">{totals.article_count || 0}</strong> {t('articles')}.
                            {t('lastUpdated')}: {dayjs(latestTimestamp).format('YYYY-MM-DD HH:mm')}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={toggleLang} className="btn-secondary" style={{
                            padding: '6px 12px',
                            fontSize: 13,
                            cursor: 'pointer',
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: 6,
                            fontWeight: 600
                        }}>
                            {lang === 'zh' ? 'EN' : '中'}
                        </button>
                        <a href="https://github.com/Hessel2333/sspai_tracking" target="_blank" className="article-link" style={{ fontSize: 14 }}>
                            {t('viewGitHub')} ↗
                        </a>
                    </div>
                </header>

                {/* --- Summary Cards --- */}
                <div className="grid">
                    <Card title={t('totalViews')} value={totals.views || totals.total_views} icon="👀" />
                    <Card title={t('totalLikes')} value={totals.likes || totals.total_likes} icon="❤️" />
                    <Card title={t('totalComments')} value={totals.comments || totals.total_comments} icon="💬" />
                </div>

                {/* --- Chart --- */}
                <div className="section">
                    <div className="section-header">
                        <span className="card-title">{t('viewsTrend')}</span>
                    </div>
                    <div style={{ padding: 24 }}>
                        <StatsChart
                            history={history.filter(h => (h.totals?.views || h.total_views) > 0)}
                            title={t('totalViews')}
                            dataKey={Object.keys(totals).includes('views') ? 'totals.views' : 'total_views'}
                        />
                    </div>
                </div>

                {/* --- Article List --- */}
                <div className="section">
                    <div className="section-header">
                        <h2>{t('trackedArticles')}</h2>
                    </div>
                    {latest.articles && latest.articles.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="sortable-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>{t('columns.title')} <SortIcon column="title" /></th>
                                        <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer' }}>{t('columns.date')} <SortIcon column="created_at" /></th>
                                        <th className="text-right" onClick={() => requestSort('views')} style={{ cursor: 'pointer' }}>{t('columns.views')} <SortIcon column="views" /></th>
                                        <th className="text-right" onClick={() => requestSort('likes')} style={{ cursor: 'pointer' }}>{t('columns.likes')} <SortIcon column="likes" /></th>
                                        <th className="text-right" onClick={() => requestSort('comments')} style={{ cursor: 'pointer' }}>{t('columns.comments')} <SortIcon column="comments" /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedArticles.map(article => (
                                        <tr key={article.id}>
                                            <td>
                                                <Link href={`/post/${article.id}`} className="article-link">
                                                    {article.title}
                                                </Link>
                                            </td>
                                            <td className="meta-text">{dayjs.unix(article.created_at).format('YYYY-MM-DD')}</td>
                                            <td className="stat-cell">{article.views.toLocaleString()}</td>
                                            <td className="stat-cell">{article.likes.toLocaleString()}</td>
                                            <td className="stat-cell">{article.comments.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>{t('noArticles')}</div>
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
    };
}
