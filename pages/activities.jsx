import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

export default function ActivityPage({ userData, latestTimestamp }) {
    const { t } = useLanguage();

    if (!userData || !userData.engagement?.all_activities) {
        return <div className="container" style={{ padding: 40 }}>No activity data found.</div>;
    }

    const activities = userData.engagement.all_activities;

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>{`${t('engagement')} - ${t('title')}`}</title>
            </Head>

            <main className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
                <Link href="/" className="back-link">
                    ← {t('backToDashboard')}
                </Link>

                <header style={{ marginBottom: 32 }}>
                    <div>
                        <span className="badge">{t('engagement')}</span>
                        <h1 style={{ marginTop: 12 }}>{t('viewAllActivities')}</h1>
                        <p className="subtitle">
                            {activities.length} {t('dataPoints')} • {t('lastUpdated')}: {dayjs(latestTimestamp).format('YYYY-MM-DD HH:mm')}
                        </p>
                    </div>
                </header>

                <div className="section">
                    <div className="activity-timeline" style={{ padding: '32px 24px' }}>
                        {activities.map((act, i) => (
                            <div key={i} className="timeline-item" style={{ marginBottom: 24 }}>
                                <div className="timeline-time" style={{ width: 100, fontSize: 12 }}>
                                    {dayjs.unix(act.created_at).format('YYYY-MM-DD')}<br />
                                    <span style={{ fontSize: 10, opacity: 0.7 }}>{dayjs.unix(act.created_at).format('HH:mm')}</span>
                                </div>
                                <div className="timeline-content">
                                    <span className="timeline-action" style={{ fontSize: 14 }}>{act.action}</span>
                                    {act.target_title && (
                                        <span className="timeline-target" style={{ fontSize: 13, marginTop: 2, display: 'block' }}>
                                            {act.target_id ? (
                                                <a
                                                    href={act.type === 'topic' ? `https://sspai.com/community/topic/${act.target_id}` : `https://sspai.com/post/${act.target_id}`}
                                                    target="_blank"
                                                    className="timeline-link"
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
                                                background: 'var(--bg-body)',
                                                borderRadius: '8px',
                                                borderLeft: '4px solid var(--accent-color)',
                                                lineHeight: '1.6'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: act.comment_content }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
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
