import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import StatsChart from '../components/StatsChart';
import SocialRadar from '../components/SocialRadar';
import SocialAvatarGrid from '../components/SocialAvatarGrid';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home({ history, latest, previous, latestTimestamp, slug, nickname, avatarUrl, topTags, topEditors, userData }) {
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
                <title>{`${nickname} 的内容分析 - ${t('title')}`}</title>
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
                <div className="profile-section" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0 }}>
                            <img
                                src={avatarUrl}
                                alt={nickname}
                                className="avatar"
                                style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover' }}
                            />
                        </div>
                        <div className="profile-info" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: 24 }}>{nickname}</h3>
                                    <p style={{ margin: '8px 0', color: 'var(--text-secondary)' }}>{t('bio')}</p>
                                </div>

                                {userData.user_reward_badges && userData.user_reward_badges.length > 0 && (
                                    <div className="profile-badges-deck" style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginLeft: 24,
                                        flexWrap: 'wrap',
                                        justifyContent: 'flex-end',
                                        maxWidth: 200
                                    }}>
                                        {userData.user_reward_badges.map(badge => (
                                            <div key={badge.id} className="badge-wrapper" style={{ position: 'relative' }}>
                                                <img
                                                    src={badge.icon}
                                                    alt={badge.name}
                                                    title={badge.name}
                                                    style={{ width: 44, height: 44, cursor: 'help' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Inline Stats */}
                            <div className="profile-stats-inline" style={{
                                display: 'flex',
                                gap: 24,
                                marginTop: 16,
                                borderTop: '1px solid var(--border-color)',
                                paddingTop: 16
                            }}>
                                <div className="stat-item">
                                    <span className="stat-label">{t('joinedLabel')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>
                                        {userData.created_at ? Math.floor((dayjs().unix() - userData.created_at) / 86400) : '-'}{t('days')}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{t('chargingLabel')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>{userData.liked_count || 0} ⚡</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{t('viewLabel')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>
                                        {userData.article_view_count
                                            ? (userData.article_view_count > 10000 ? (userData.article_view_count / 10000).toFixed(1) + (lang === 'zh' ? t('unitTenThousandZh') : t('unitTenThousand')) : userData.article_view_count)
                                            : (totals.views > 10000 ? (totals.views / 10000).toFixed(1) + (lang === 'zh' ? t('unitTenThousandZh') : t('unitTenThousand')) : totals.views)}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{t('followedUsers')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>
                                        {userData.engagement?.following?.total || 0}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{t('personalComments')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>
                                        {userData.engagement?.comments_made_total || 0}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">{t('likedGiven')}</span>
                                    <span className="stat-value" style={{ fontSize: 16 }}>
                                        {userData.engagement?.likes_given_total || 0}
                                    </span>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <a href={`https://sspai.com/u/${slug}/posts`} target="_blank" className="btn-profile" style={{ fontSize: 12, padding: '4px 12px' }}>
                                        {t('viewProfile')} ↗
                                    </a>
                                </div>
                            </div>
                        </div>
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
                        icon="⚡"
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

                {/* --- Recent Activity Timeline --- */}
                {userData.engagement?.all_activities && userData.engagement.all_activities.length > 0 && (
                    <div className="section" style={{ marginBottom: 24 }}>
                        <div className="section-header">
                            <span className="card-title">{t('engagement')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span className="meta-text">{t('activeOn')} {userData.engagement.all_activities.length} {t('dataPoints')}</span>
                                <Link href="/activities" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13, fontWeight: 'bold' }}>
                                    {t('socialVault')} ↗
                                </Link>
                            </div>
                        </div>
                        <div className="activity-timeline">
                            {userData.engagement.all_activities.slice(0, 10).map((act, i) => (
                                <div key={i} className="timeline-item">
                                    <div className="timeline-time">{dayjs.unix(act.created_at).format('MM-DD HH:mm')}</div>
                                    <div className="timeline-content">
                                        <span className="timeline-action">{act.action}</span>
                                        {act.target_title && (
                                            <span className="timeline-target">
                                                {act.target_id ? (
                                                    <a href={`https://sspai.com/post/${act.target_id}`} target="_blank" className="timeline-link">
                                                        「{act.target_title}」
                                                    </a>
                                                ) : act.key === 'follow_user' && act.target_slug ? (
                                                    <a href={`https://sspai.com/u/${act.target_slug}/posts`} target="_blank" className="timeline-link">
                                                        「{act.target_title}」
                                                    </a>
                                                ) : act.key === 'follow_special_column' && act.target_slug ? (
                                                    <a href={`https://sspai.com/column/${act.target_slug}`} target="_blank" className="timeline-link">
                                                        「{act.target_title}」
                                                    </a>
                                                ) : (
                                                    `「${act.target_title}」`
                                                )}
                                            </span>
                                        )}
                                        {act.comment_content && (
                                            <div className="timeline-comment-preview" style={{
                                                fontSize: 12,
                                                color: 'var(--text-secondary)',
                                                marginTop: 4,
                                                paddingLeft: 12,
                                                borderLeft: '2px solid var(--border-color)',
                                                fontStyle: 'italic',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }} dangerouslySetInnerHTML={{ __html: act.comment_content }} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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

                {/* --- Social DNA --- */}
                {userData.engagement?.social_dna && (
                    <div className="dna-grid" style={{ marginTop: 24, marginBottom: 24 }}>
                        <div className="dna-card">
                            <div className="section-header" style={{ marginBottom: 16 }}>
                                <span className="card-title">{t('socialTags')}</span>
                                <span className="meta-text" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{t('socialDNA')}</span>
                            </div>
                            <div style={{ padding: '0 10px' }}>
                                <SocialRadar
                                    data={userData.engagement.social_dna.top_tags.map(t => t.count)}
                                    labels={userData.engagement.social_dna.top_tags.map(t => `#${t.name}`)}
                                    title={t('interacts')}
                                />
                            </div>
                        </div>

                        <div className="dna-card">
                            <div className="section-header" style={{ marginBottom: 16 }}>
                                <span className="card-title">{t('socialAuthors')}</span>
                                <span className="meta-text" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{t('socialDNA')}</span>
                            </div>
                            <SocialAvatarGrid authors={userData.engagement.social_dna.author_matrix} />
                        </div>
                    </div>
                )}

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
            </main >
        </div >
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
            topEditors,
            userData: scrapedUser // Pass complete user data for achievements
        },
    };
}
