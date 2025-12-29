import { useState, useMemo } from 'react';
import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

export default function ActivityPage({ userData, latestTimestamp }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    if (!userData || !userData.engagement?.all_activities) {
        return <div className="container" style={{ padding: 40 }}>No activity data found.</div>;
    }

    const activities = userData.engagement.all_activities;

    const filteredActivities = useMemo(() => {
        let result = [...activities];

        // 1. Tab Filtering
        if (activeTab === 'articles') {
            result = result.filter(act => ['like_article', 'comment_article', 'release_article'].includes(act.key));
        } else if (activeTab === 'topics') {
            result = result.filter(act => ['community_comment_topic', 'community_release_topic', 'community_reply_topic_comment'].includes(act.key));
        } else if (activeTab === 'social') {
            result = result.filter(act => ['follow_user', 'follow_special_column'].includes(act.key));
        }

        // 2. Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(act =>
                (act.target_title && act.target_title.toLowerCase().includes(query)) ||
                (act.comment_content && act.comment_content.toLowerCase().includes(query)) ||
                (act.action && act.action.toLowerCase().includes(query))
            );
        }

        // 3. Sorting
        result.sort((a, b) => {
            return sortOrder === 'newest'
                ? b.created_at - a.created_at
                : a.created_at - b.created_at;
        });

        return result;
    }, [activities, activeTab, searchQuery, sortOrder]);

    const tabs = [
        { id: 'all', label: t('tabAll') },
        { id: 'articles', label: t('tabArticles') },
        { id: 'topics', label: t('tabTopics') },
        { id: 'social', label: t('tabSocial') }
    ];

    return (
        <div className="min-h-screen">
            <Head>
                <title>{`${t('socialVault')} - ${t('title')}`}</title>
            </Head>

            <main className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
                <Link href="/" className="back-link">
                    ← {t('backToDashboard')}
                </Link>

                <header style={{ marginBottom: 32 }}>
                    <div>
                        <span className="badge" style={{ background: 'var(--accent-color)', color: 'white' }}>{t('engagement')}</span>
                        <h1 style={{ marginTop: 12 }}>{t('socialVault')}</h1>
                        <p className="subtitle">
                            {filteredActivities.length} / {activities.length} {t('dataPoints')} • {t('lastUpdated')}: {dayjs(latestTimestamp).format('YYYY-MM-DD HH:mm')}
                        </p>
                    </div>
                </header>

                {/* --- Controls --- */}
                <div className="vault-controls" style={{
                    marginBottom: 24,
                    background: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    position: 'relative'
                }}>
                    {/* Tabs */}
                    <div className="tab-bar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'var(--accent-color)' : 'rgba(0,0,0,0.05)',
                                    color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                                    fontSize: 13,
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.12, 0, 0.39, 0)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Sort Container */}
                    <div className="search-sort-row" style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        width: '100%',
                        flexWrap: 'nowrap' // Ensure they stay in one row on wider screens
                    }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    fontSize: 14,
                                    outline: 'none',
                                    background: 'rgba(0,0,0,0.02)',
                                    height: '42px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="custom-select"
                                style={{
                                    display: 'block',
                                    padding: '0 36px 0 16px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    fontSize: 13,
                                    background: 'white',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none', // Remove default OS style
                                    fontWeight: '500',
                                    color: 'var(--text-main)',
                                    width: 'auto',
                                    minWidth: '110px'
                                }}
                            >
                                <option value="newest">{t('sortNewest')}</option>
                                <option value="oldest">{t('sortOldest')}</option>
                            </select>
                            {/* Custom Arrow */}
                            <div style={{
                                position: 'absolute',
                                right: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                fontSize: '10px',
                                opacity: 0.5
                            }}>▼</div>
                        </div>
                    </div>
                </div>

                {/* --- Timeline --- */}
                <div className="section">
                    <div className="activity-timeline" style={{ padding: '32px 24px' }}>
                        {filteredActivities.length > 0 ? (
                            filteredActivities.map((act, i) => (
                                <div key={i} className="timeline-item" style={{ marginBottom: 24 }}>
                                    <div className="timeline-time" style={{ width: 100, fontSize: 12 }}>
                                        {dayjs.unix(act.created_at).format('YYYY-MM-DD')}<br />
                                        <span style={{ fontSize: 10, opacity: 0.7 }}>{dayjs.unix(act.created_at).format('HH:mm')}</span>
                                    </div>
                                    <div className="timeline-content">
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                            <span className="timeline-action" style={{ fontSize: 14, fontWeight: 'bold' }}>{act.action}</span>
                                        </div>
                                        {act.target_title && (
                                            <span className="timeline-target" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                                                {act.target_id ? (
                                                    <a
                                                        href={act.type === 'topic' ? `https://sspai.com/community/topic/${act.target_id}` : `https://sspai.com/post/${act.target_id}`}
                                                        target="_blank"
                                                        className="timeline-link"
                                                        style={{ color: 'var(--accent-color)' }}
                                                    >
                                                        「{act.target_title}」
                                                    </a>
                                                ) : (
                                                    `「${act.target_title}」`
                                                )}
                                            </span>
                                        )}
                                        {act.comment_content && (
                                            <div
                                                className="timeline-comment-preview"
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
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                                <p>No results found for your archive search</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export async function getStaticProps() {
    const dataDir = path.join(process.cwd(), 'data');
    const historyPath = path.join(dataDir, 'history.json');
    let history = [];
    try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) { }

    const latest = history.length > 0 ? history[history.length - 1] : null;

    return {
        props: {
            userData: latest ? latest.user : null,
            latestTimestamp: latest ? latest.timestamp : null
        },
        revalidate: 60
    };
}
