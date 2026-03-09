import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProfileHeader from '../components/ProfileHeader';
import DigitalPersona from '../components/DigitalPersona';
import StatsChart from '../components/StatsChart';
import SocialRadar from '../components/SocialRadar';
import SocialAvatarGrid from '../components/SocialAvatarGrid';
import ActivityHeatmap from '../components/ActivityHeatmap';
import PerformanceScatter from '../components/PerformanceScatter';
import HabitClock from '../components/HabitClock';
import FavoritesTimeline from '../components/FavoritesTimeline';
import FavoritesAuthors from '../components/FavoritesAuthors';
import FavoritesTags from '../components/FavoritesTags';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';
import { loadDashboardData } from '../utils/dataLoader';

const LONG_COMMENT_CHAR_THRESHOLD = 280;
const LONG_COMMENT_BLOCK_THRESHOLD = 4;

function stripHtml(html = '') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isLongComment(html = '') {
    const plainTextLength = stripHtml(html).length;
    const blockCount = (html.match(/<(p|div|br|li)\b/gi) || []).length;
    return plainTextLength > LONG_COMMENT_CHAR_THRESHOLD || blockCount > LONG_COMMENT_BLOCK_THRESHOLD;
}

function getActivityId(act) {
    return [
        act.key || '',
        act.created_at || '',
        act.target_id || '',
        act.target_slug || '',
        (act.target_title || '').slice(0, 40),
        (act.comment_content || '').slice(0, 80)
    ].join('|');
}

export default function Home({ history, latest, previous, latestTimestamp, slug, nickname, topTags, userData, personaData }) {
    const { t, toggleLang, lang } = useLanguage();
    const totals = latest.totals || latest;
    const prevTotals = previous ? (previous.totals || previous) : null;
    const cookieStatus = latest.cookie_status || 'valid';
    const safeUserData = userData || {};
    const hasUserData = Boolean(userData && Object.keys(userData).length > 0);
    const hasDashboardData = Boolean(latestTimestamp) || (latest.articles || []).length > 0;
    const updatedLabel = latestTimestamp ? dayjs(latestTimestamp).format('MM-DD HH:mm') : '--';

    // View States
    const [activeTab, setActiveTab] = useState('insight'); // insight, content, social, honors
    const [sortConfig, setSortConfig] = useState({ key: 'views', direction: 'desc' });
    const [expandedComments, setExpandedComments] = useState({});

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

    const toggleCommentExpanded = (activityId) => {
        setExpandedComments((prev) => ({
            ...prev,
            [activityId]: !prev[activityId]
        }));
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
                {/* Cookie Expiry Warning Banner */}
                {cookieStatus === 'expired' && (
                    <div className="fade-in glass" style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        background: 'rgba(255, 170, 0, 0.15)',
                        border: '1px solid rgba(255, 170, 0, 0.3)',
                        borderRadius: '12px',
                        color: '#FFBE40',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                            {lang === 'zh'
                                ? '检测到 SSPAI Cookie 已失效，浏览量数据已隐藏。请到 GitHub 更新 Secrets。'
                                : 'SSPAI Cookie expired. View counts are hidden. Please update GitHub Secrets.'}
                        </span>
                    </div>
                )}
                {!hasDashboardData && (
                    <div className="fade-in glass" style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        background: 'rgba(0, 122, 255, 0.08)',
                        border: '1px solid rgba(0, 122, 255, 0.2)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                    }}>
                        {lang === 'zh'
                            ? '暂无可展示的数据，请先运行抓取任务（npm run scrape）并检查 data/current_stats.json。'
                            : 'No dashboard data yet. Run `npm run scrape` and check data/current_stats.json.'}
                    </div>
                )}

                {/* --- Top Bar (Settings + Lang) --- */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <p className="subtitle" style={{ fontSize: 11, margin: 0, opacity: 0.6 }}>
                        {updatedLabel} 更新
                    </p>
                    <button onClick={toggleLang} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>
                        {lang === 'zh' ? 'EN' : '中'}
                    </button>
                </div>

                {/* --- Profile Header (Restored) --- */}
                <ProfileHeader userData={hasUserData ? safeUserData : null} totals={totals} t={t} lang={lang} />

                {/* --- Tab Navigation --- */}
                <nav className="tab-nav" style={{
                    display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'rgba(0,0,0,0.03)',
                    borderRadius: 12, overflowX: 'auto'
                }}>
                    {['insight', 'content', 'social', 'favorites', 'honors'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={activeTab === tab ? 'tab-btn active' : 'tab-btn'}
                            style={{
                                flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8,
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
                                fontWeight: activeTab === tab ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.2s', fontSize: 14,
                                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                        </button>
                    ))}
                </nav>

                {/* --- Tab Content: Insight (洞察) --- */}
                {activeTab === 'insight' && (
                    <div className="tab-pane fade-in">
                        {personaData && <DigitalPersona data={personaData} />}

                        <div className="card glass-panel" style={{ padding: 0, marginTop: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">🔥 {t('activityHeatmap', 'Activity Heatmap')}</span>
                            </div>
                            <div className="card-content" style={{ padding: '24px' }}>
                                <ActivityHeatmap activities={safeUserData.engagement?.all_activities} t={t} />
                            </div>
                        </div>

                        <div className="grid" style={{ marginTop: 24 }}>
                            <Card title={t('totalViews')} value={totals.views || totals.total_views} prevValue={prevTotals ? (prevTotals.views || prevTotals.total_views) : null} icon="👀" t={t} />
                            <Card title={t('totalLikes')} value={totals.likes || totals.total_likes} prevValue={prevTotals ? (prevTotals.likes || prevTotals.total_likes) : null} icon="⚡" t={t} />
                            <Card title={t('totalComments')} value={totals.comments || totals.total_comments} prevValue={prevTotals ? (prevTotals.comments || prevTotals.total_comments) : null} icon="💬" t={t} />
                        </div>

                        <div className="card glass-panel" style={{ padding: 0, marginTop: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">📈 {t('viewsTrend')}</span>
                            </div>
                            <div className="card-content" style={{ padding: '24px' }}>
                                <StatsChart history={history} title={t('totalViews')} dataKey="totals.views" color="rgb(217, 48, 37)" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Tab Content: Content (作品) --- */}
                {activeTab === 'content' && (
                    <div className="tab-pane fade-in">
                        <div className="card glass-panel" style={{ padding: 0, marginBottom: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">🎯 {t('performanceScatter', 'Performance Scatter')}</span>
                            </div>
                            <div className="card-content" style={{ padding: '0 24px 24px' }}>
                                <PerformanceScatter data={latest.articles} t={t} />
                            </div>
                        </div>

                        <div className="card glass-panel" style={{ padding: 0, marginBottom: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">🏷️ {t('tagCloud')}</span>
                            </div>
                            <div className="card-content" style={{ padding: '24px' }}>
                                <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {topTags.map(tag => (
                                        <a href={`https://sspai.com/tag/${tag.name}`} target="_blank" key={tag.name} className="tag-badge" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                                            <span style={{ fontWeight: 600 }}>{tag.name}</span>
                                            <span style={{ fontSize: 11, opacity: 0.6, background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 10 }}>{tag.count}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {topArticle && (
                            <div className="section" style={{ marginTop: 24 }}>
                                <div className="section-header">
                                    <span className="card-title">🏆 {t('featuredWork')}</span>
                                </div>
                                <Link href={`/post/${topArticle.id}`} className="featured-card">
                                    <div className="featured-content">
                                        <span className="featured-badge">{t('topArticle')}</span>
                                        <h4 style={{ fontSize: 18 }}>{topArticle.title}</h4>
                                        <p style={{ margin: '8px 0 0' }}>{topArticle.views.toLocaleString()} 阅读 • {topArticle.likes.toLocaleString()} 充电</p>
                                    </div>
                                    <div style={{ fontSize: 40 }}>👑</div>
                                </Link>
                            </div>
                        )}

                        <div className="section" style={{ marginTop: 24 }}>
                            <div className="section-header">
                                <span className="card-title">📚 {t('trackedArticles')} ({totals.article_count || 0})</span>
                            </div>
                            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                                <table className="sortable-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => requestSort('title')} style={{ cursor: 'pointer' }}>{t('columns.title')} <SortIcon column="title" /></th>
                                            <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer' }}>{t('columns.date')} <SortIcon column="created_at" /></th>
                                            <th className="text-right" onClick={() => requestSort('views')} style={{ cursor: 'pointer' }}>{t('columns.views')} <SortIcon column="views" /></th>
                                            <th className="text-right" onClick={() => requestSort('likes')} style={{ cursor: 'pointer' }}>{t('columns.likes')} <SortIcon column="likes" /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedArticles.map(article => (
                                            <tr key={article.id}>
                                                <td>
                                                    <Link href={`/post/${article.id}`} className="article-link">{article.title}</Link>
                                                </td>
                                                <td className="meta-text">{dayjs.unix(article.created_at).format('YYYY-MM-DD')}</td>
                                                <td className="stat-cell text-right">{article.views.toLocaleString()}</td>
                                                <td className="stat-cell text-right">{article.likes.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Tab Content: Social (社交) --- */}
                {activeTab === 'social' && (
                    <div className="tab-pane fade-in">
                        {safeUserData.engagement?.social_dna && (
                            <div className="dna-grid">
                                <div className="card glass-panel" style={{ padding: 0 }}>
                                    <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <span className="card-title">🕸️ {t('socialTags')}</span>
                                    </div>
                                    <div className="card-content" style={{ padding: '24px' }}>
                                        <SocialRadar data={(safeUserData.engagement.social_dna.top_tags || []).map(t => t.count)} labels={(safeUserData.engagement.social_dna.top_tags || []).map(t => `#${t.name}`)} title={t('interacts')} />
                                    </div>
                                </div>
                                <div className="card glass-panel" style={{ padding: 0 }}>
                                    <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <span className="card-title">👥 {t('socialAuthors')}</span>
                                    </div>
                                    <div className="card-content" style={{ padding: '24px' }}>
                                        <SocialAvatarGrid authors={safeUserData.engagement.social_dna.author_matrix || []} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card glass-panel" style={{ padding: 0, marginTop: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="card-title">💬 {t('engagement')}</span>
                                <Link href="/activities" className="btn-secondary" style={{ fontSize: 13, fontWeight: 'bold' }}>
                                    {t('socialVault')} ↗
                                </Link>
                            </div>
                            <div className="card-content" style={{ padding: 0 }}>
                                <div className="activity-timeline">
                                    {safeUserData.engagement?.all_activities?.slice(0, 10).map((act) => {
                                        const activityId = getActivityId(act);
                                        const shouldCollapse = Boolean(act.comment_content) && isLongComment(act.comment_content);
                                        const isExpanded = Boolean(expandedComments[activityId]);

                                        return (
                                            <div key={activityId} className="timeline-item" style={{ padding: '12px 24px', borderBottom: '1px solid #eee' }}>
                                                <div className="timeline-time">{dayjs.unix(act.created_at).format('MM-DD HH:mm')}</div>
                                                <div className="timeline-content">
                                                    <span className="timeline-action">{act.action}</span>
                                                    {act.target_title && (
                                                        <span className="timeline-target">
                                                            {act.target_id ? (
                                                                <a
                                                                    href={act.type === 'topic' ? `https://sspai.com/community/topic/${act.target_id}` : `https://sspai.com/post/${act.target_id}`}
                                                                    target="_blank"
                                                                    className="timeline-link"
                                                                >
                                                                    「{act.target_title}」
                                                                </a>
                                                            ) : act.key === 'follow_user' && act.target_slug ? (
                                                                <a
                                                                    href={`https://sspai.com/u/${act.target_slug}/posts`}
                                                                    target="_blank"
                                                                    className="timeline-link"
                                                                >
                                                                    「{act.target_title}」
                                                                </a>
                                                            ) : act.key === 'follow_special_column' && act.target_slug ? (
                                                                <a
                                                                    href={`https://sspai.com/column/${act.target_slug}`}
                                                                    target="_blank"
                                                                    className="timeline-link"
                                                                >
                                                                    「{act.target_title}」
                                                                </a>
                                                            ) : (
                                                                <span className="timeline-link">「{act.target_title}」</span>
                                                            )}
                                                        </span>
                                                    )}
                                                    {act.comment_content && (
                                                        <>
                                                            <div
                                                                className={`timeline-comment-preview${shouldCollapse && !isExpanded ? ' is-collapsed' : ''}`}
                                                                style={{
                                                                    fontSize: 13,
                                                                    color: 'var(--text-secondary)',
                                                                    marginTop: 8,
                                                                    padding: '12px 16px',
                                                                    background: 'rgba(0,0,0,0.03)',
                                                                    borderRadius: '8px',
                                                                    borderLeft: '4px solid var(--accent-color)',
                                                                    lineHeight: '1.6'
                                                                }}
                                                                dangerouslySetInnerHTML={{ __html: act.comment_content }}
                                                            />
                                                            {shouldCollapse && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCommentExpanded(activityId)}
                                                                    className="timeline-comment-toggle"
                                                                >
                                                                    {isExpanded ? t('collapseComment') : t('expandComment')}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Tab Content: Favorites (收藏) --- */}
                {activeTab === 'favorites' && (
                    <div className="tab-pane fade-in">
                        {/* Stats Summary */}
                        <div className="metrics-bar" style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '16px 24px', background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className="metric-item">
                                <span className="label" style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('totalFavorites') || '总收藏'}</span>
                                <span className="value" style={{ fontSize: 18, fontWeight: 700 }}>
                                    {safeUserData.engagement?.favorites?.total || 0}
                                </span>
                            </div>
                            <div className="metric-item" style={{ borderLeft: '1px solid #eee', paddingLeft: 16 }}>
                                <span className="label" style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('favAuthors') || '收藏作者'}</span>
                                <span className="value" style={{ fontSize: 18, fontWeight: 700 }}>
                                    {new Set(safeUserData.engagement?.favorites?.list?.map(f => f.author?.nickname).filter(Boolean)).size || 0}
                                </span>
                            </div>
                        </div>

                        {/* Favorites Charts */}
                        <div className="card glass-panel" style={{ padding: 0, marginBottom: 24 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">📅 {t('favoritesTimeline') || '收藏时间轴'}</span>
                            </div>
                            <div className="card-content" style={{ padding: '24px' }}>
                                <FavoritesTimeline favorites={safeUserData.engagement?.favorites?.list} t={t} />
                            </div>
                        </div>

                        <div className="grid" style={{ marginBottom: 24, gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div className="card glass-panel" style={{ padding: 0 }}>
                                <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span className="card-title">✍️ {t('topFavAuthors') || '偏好作者'}</span>
                                </div>
                                <div className="card-content" style={{ padding: '24px' }}>
                                    <FavoritesAuthors favorites={safeUserData.engagement?.favorites?.list} t={t} />
                                </div>
                            </div>
                            <div className="card glass-panel" style={{ padding: 0 }}>
                                <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span className="card-title">🏷️ {t('favTags') || '偏好标签'}</span>
                                </div>
                                <div className="card-content" style={{ padding: '24px' }}>
                                    <FavoritesTags favorites={safeUserData.engagement?.favorites?.list} t={t} />
                                </div>
                            </div>
                        </div>

                        {/* Favorites List */}
                        <div className="card glass-panel" style={{ padding: 0 }}>
                            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <span className="card-title">⭐️ {t('recentFavorites') || '最近收藏'}</span>
                            </div>
                            <div className="card-content" style={{ padding: 0 }}>
                                {safeUserData.engagement?.favorites?.list?.length > 0 ? (
                                    <table className="sortable-table">
                                        <thead>
                                            <tr>
                                                <th>{t('columns.title')}</th>
                                                <th>{t('columns.author') || '作者'}</th>
                                                <th className="text-right">{t('columns.date')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {safeUserData.engagement.favorites.list.map(fav => (
                                                <tr key={fav.id}>
                                                    <td>
                                                        <a href={`https://sspai.com/post/${fav.id}`} target="_blank" className="article-link">{fav.title}</a>
                                                    </td>
                                                    <td className="meta-text">{fav.author?.nickname || '-'}</td>
                                                    <td className="meta-text text-right">{dayjs.unix(fav.created_at).format('YYYY-MM-DD')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {t('noData') || '暂无数据'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
                }

                {/* --- Tab Content: Honors (荣誉) --- */}
                {
                    activeTab === 'honors' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass-panel" style={{ padding: 0 }}>
                                <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span className="card-title">🎖️ {t('achievements')}</span>
                                </div>
                                <div className="card-content" style={{ padding: '24px' }}>
                                    {safeUserData.user_reward_badges && safeUserData.user_reward_badges.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                            {safeUserData.user_reward_badges.map(badge => (
                                                <div key={badge.id} style={{ textAlign: 'center', width: 80 }}>
                                                    <img src={badge.icon} alt={badge.name} style={{ width: 60, height: 60 }} />
                                                    <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--text-secondary)' }}>{badge.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="meta-text">暂无勋章</p>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-panel" style={{ padding: 0, marginTop: 24 }}>
                                <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span className="card-title">⌚ {t('habitClock', 'Habit Clock')}</span>
                                </div>
                                <div className="card-content" style={{ padding: '24px' }}>
                                    <HabitClock data={safeUserData.engagement?.all_activities} t={t} />
                                </div>
                            </div>
                        </div>
                    )
                }

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
    const { history, latest, previous, latestTimestamp, topTags, userData, personaData } = loadDashboardData();
    const cleanUserData = userData || {};
    const slug = process.env.SSPAI_SLUG || cleanUserData.slug || 'Hessel';
    const nickname = process.env.SSPAI_NICKNAME || cleanUserData.nickname || slug;

    return {
        props: {
            history,
            latest,
            previous,
            latestTimestamp,
            slug,
            nickname,
            topTags,
            userData: cleanUserData,
            personaData
        },
    };
}
