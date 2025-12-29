import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import StatsChart from '../components/StatsChart';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home({ history, latest, previous, latestTimestamp, slug, nickname, avatarUrl, topTags, topEditors }) {
    const { t, toggleLang, lang } = useLanguage();
    const totals = latest.totals || latest;
    const prevTotals = previous ? (previous.totals || previous) : null;

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

    const topArticle = sortedArticles[0];

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
                <title>{nickname} 的内容分析 - {t('title')}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="container">
                <header>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <h1>{t('title')}</h1>
                        <p className="subtitle" style={{ fontSize: 12 }}>
                            {dayjs(latestTimestamp).format('YYYY-MM-DD HH:mm')} 更新
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={toggleLang} className="btn-secondary" style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: 4,
                            fontWeight: 600
                        }}>
                            {lang === 'zh' ? 'EN' : '中'}
                        </button>
                    </div>
                </header>

                {/* --- Profile Section --- */}
                <div className="profile-section">
                    <img
                        src={avatarUrl}
                        alt={nickname}
                        className="avatar"
                    />
                    <div className="profile-info">
                        <h3>{nickname}</h3>
                        <p>{t('bio')}</p>
                        <a href={`https://sspai.com/u/${slug}/posts`} target="_blank" className="btn-profile">
                            {t('viewProfile')} ↗
                        </a>
                    </div>
                </div>

                {/* --- Summary Cards --- */}
                <div className="grid">
                    <Card
                        title={t('totalViews')}
                        value={totals.views || totals.total_views}
                        prevValue={prevTotals ? (prevTotals.views || prevTotals.total_views) : null}
                        icon="👀"
                        t={t}
                    />
                    <Card
                        title={t('totalLikes')}
                        value={totals.likes || totals.total_likes}
                        prevValue={prevTotals ? (prevTotals.likes || prevTotals.total_likes) : null}
                        icon="❤️"
                        t={t}
                    />
                    <Card
                        title={t('totalComments')}
                        value={totals.comments || totals.total_comments}
                        prevValue={prevTotals ? (prevTotals.comments || prevTotals.total_comments) : null}
                        icon="💬"
                        t={t}
                    />
                </div>

                {/* --- Featured Article --- */}
                {topArticle && (
                    <div className="featured-grid">
                        <div className="featured-header">
                            <h2>{t('featuredWork')}</h2>
                        </div>
                        <Link href={`/post/${topArticle.id}`} className="featured-card">
                            <div className="featured-content">
                                <span className="featured-badge">{t('topArticle')}</span>
                                <h4>{topArticle.title}</h4>
                                <p>{topArticle.views.toLocaleString()} {t('columns.views')} • {topArticle.likes.toLocaleString()} {t('columns.likes')}</p>
                            </div>
                            <div style={{ fontSize: 32 }}>🏆</div>
                        </Link>
                    </div>
                )}

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

                {/* --- Creative DNA --- */}
                <div className="dna-grid">
                    <div className="dna-card">
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <span className="card-title">{t('topTags')}</span>
                        </div>
                        <div className="dna-list">
                            {topTags.map((item, i) => (
                                <div key={i} className="dna-item">
                                    <div className="dna-label">
                                        <a href={`https://sspai.com/tag/${item.name}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span>#{item.name}</span>
                                            <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
                                        </a>
                                    </div>
                                    <div className="dna-bar-bg">
                                        <div className="dna-bar-fill" style={{ width: `${(item.count / topTags[0].count) * 100}%` }}></div>
                                    </div>
                                    <span className="dna-count">{item.count} {t('articlesCount')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="dna-card">
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <span className="card-title">{t('topEditors')}</span>
                        </div>
                        <div className="dna-list">
                            {topEditors.map((item, i) => (
                                <div key={i} className="dna-item">
                                    <div className="dna-label">
                                        {item.slug ? (
                                            <a href={`https://sspai.com/u/${item.slug}/posts`} target="_blank" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span>@{item.name}</span>
                                                <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
                                            </a>
                                        ) : (
                                            <span>@{item.name}</span>
                                        )}
                                    </div>
                                    <div className="dna-bar-bg">
                                        <div className="dna-bar-fill" style={{ width: `${(item.count / topEditors[0].count) * 100}%` }}></div>
                                    </div>
                                    <span className="dna-count">{item.count} {t('articlesCount')}</span>
                                </div>
                            ))}
                            {topEditors.length === 0 && (
                                <div style={{ color: '#999', fontSize: 13 }}>Pending data...</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Article List --- */}
                <div className="section" style={{ marginBottom: 0 }}>
                    <div className="section-header">
                        <h2>{t('trackedArticles')}</h2>
                        <span className="meta-text">{totals.article_count || 0} {t('articles')}</span>
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
                                                {article.tags && article.tags.length > 0 && (
                                                    <div className="tags-container" style={{ marginTop: 2, gap: 4 }}>
                                                        {article.tags.slice(0, 2).map(tag => (
                                                            <a href={`https://sspai.com/tag/${tag}`} target="_blank" key={tag} className="tag-badge" style={{ fontSize: 9, padding: '1px 4px', textDecoration: 'none' }}>#{tag}</a>
                                                        ))}
                                                    </div>
                                                )}
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

                <footer>
                    <div className="footer-links">
                        <a href={`https://sspai.com/u/${slug}/posts`} target="_blank">{t('viewProfile')}</a>
                        <a href="https://github.com/Hessel2333/sspai_tracking" target="_blank">{t('viewGitHub')}</a>
                    </div>
                    <div className="footer-creds">
                        © {new dayjs().format('YYYY')} {nickname} • Powered by <a href="https://github.com/Hessel2333/sspai_tracking" target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>SSPAI Tracker</a>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function Card({ title, value, prevValue, icon, t }) {
    const delta = prevValue !== null ? value - prevValue : 0;

    return (
        <div className="card">
            <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="card-title">{title}</span>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <p className="card-value">{value ? value.toLocaleString() : 0}</p>
                    {delta > 0 && (
                        <span className="delta-tag delta-up">
                            {t('growth')} +{delta}
                        </span>
                    )}
                    {delta === 0 && prevValue !== null && (
                        <span className="delta-tag delta-zero">+0</span>
                    )}
                </div>
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
    const previous = history.length > 1 ? history[history.length - 2] : null;

    // Favor scraped user data from history.json if available
    const scrapedUser = latest.user || {};

    // --- Aggregation Logic for Creative DNA ---
    const tagCounts = {};
    const editorCounts = {};

    if (latest.articles) {
        latest.articles.forEach(art => {
            // Count Tags
            if (art.tags && Array.isArray(art.tags)) {
                art.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
            // Count Editors
            if (art.editor) {
                // Handle both legacy string and new object format
                const name = typeof art.editor === 'object' ? art.editor.nickname : art.editor;
                const slug = typeof art.editor === 'object' ? art.editor.slug : null;

                if (!editorCounts[name]) {
                    editorCounts[name] = { count: 0, slug: slug };
                }
                editorCounts[name].count += 1;
                // Update slug if it was missing (e.g. mixed data types)
                if (slug && !editorCounts[name].slug) {
                    editorCounts[name].slug = slug;
                }
            }
        });
    }

    const sortAndSlice = (counts) => {
        // Tag counts are simple numbers
        return Object.entries(counts)
            .map(([name, val]) => ({ name, count: val }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    };

    const sortAndSliceEditors = (counts) => {
        // Editor counts are objects { count, slug }
        return Object.entries(counts)
            .map(([name, data]) => ({ name, count: data.count, slug: data.slug }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    };

    const topTags = sortAndSlice(tagCounts);
    const topEditors = sortAndSliceEditors(editorCounts);

    return {
        props: {
            history,
            latest,
            previous,
            latestTimestamp: latest.timestamp || null,
            slug: process.env.SSPAI_SLUG || 'Hessel',
            nickname: process.env.SSPAI_NICKNAME || scrapedUser.nickname || process.env.SSPAI_SLUG || 'Hessel',
            avatarUrl: process.env.SSPAI_AVATAR || scrapedUser.avatar || 'https://cdn.sspai.com/static/avatar/default.png',
            topTags,
            topEditors
        },
    };
}
