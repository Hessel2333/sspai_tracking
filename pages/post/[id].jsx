import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import StatsChart from '../../components/StatsChart';
import dayjs from 'dayjs';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ArticleDetail({ article, history, latestTimestamp }) {
    const { t } = useLanguage();

    if (!article) return <div className="container" style={{ padding: 40 }}>Article not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>{article.title} - {t('title')}</title>
            </Head>

            <main className="container">
                <div style={{ marginTop: 40, marginBottom: 20 }}>
                    <Link href="/" className="back-link">
                        ← {t('backToDashboard')}
                    </Link>
                </div>

                <header>
                    <div>
                        <span className="badge">{t('articleAnalysis')}</span>
                        <h1 style={{ marginTop: 12 }}>{article.title}</h1>
                        <p className="subtitle">
                            ID: {article.id} • {t('published')}: {dayjs.unix(article.created_at).format('YYYY-MM-DD')} • {t('lastUpdated')}: {dayjs(latestTimestamp).format('HH:mm')}
                        </p>
                    </div>
                    <a href={`https://sspai.com/post/${article.id}`} target="_blank" className="article-link text-accent">
                        {t('viewOnSSPAI')} ↗
                    </a>
                </header>

                {/* --- Key Metrics --- */}
                <div className="grid">
                    <Card title={t('totalViews')} value={article.views} icon="👀" />
                    <Card title={t('totalLikes')} value={article.likes} icon="❤️" />
                    <Card title={t('totalComments')} value={article.comments} icon="💬" />
                </div>

                {/* --- Charts --- */}
                <h2 style={{ marginBottom: 16 }}>{t('growthTrends')}</h2>

                <div className="section">
                    <div className="section-header">
                        <span className="card-title">{t('viewsGrowth')}</span>
                        <span className="meta-text">{history.length} {t('dataPoints')}</span>
                    </div>
                    <div style={{ padding: 24 }}>
                        <StatsChart history={history} title={t('totalViews')} dataKey="views" color="rgb(217, 48, 37)" />
                    </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 40 }}>
                    <div className="section" style={{ marginBottom: 0 }}>
                        <div className="section-header">
                            <span className="card-title">{t('likesGrowth')}</span>
                        </div>
                        <div style={{ padding: 24 }}>
                            <StatsChart history={history} title={t('totalLikes')} dataKey="likes" color="rgb(52, 199, 89)" />
                        </div>
                    </div>
                    <div className="section" style={{ marginBottom: 0 }}>
                        <div className="section-header">
                            <span className="card-title">{t('commentsGrowth')}</span>
                        </div>
                        <div style={{ padding: 24 }}>
                            <StatsChart history={history} title={t('totalComments')} dataKey="comments" color="rgb(0, 122, 255)" />
                        </div>
                    </div>
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

export async function getStaticPaths() {
    const dataDir = path.join(process.cwd(), 'data');
    const historyPath = path.join(dataDir, 'history.json');
    let history = [];
    try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) { }

    const latest = history.length > 0 ? history[history.length - 1] : { articles: [] };
    const paths = (latest.articles || []).map(article => ({
        params: { id: article.id.toString() }
    }));

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
    const dataDir = path.join(process.cwd(), 'data');
    const historyPath = path.join(dataDir, 'history.json');
    let history = [];
    try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) { }

    const articleId = parseInt(params.id);

    const latestSnapshot = history.length > 0 ? history[history.length - 1] : {};
    const article = (latestSnapshot.articles || []).find(a => a.id === articleId) || null;

    const articleHistory = history.map(snapshot => {
        const art = (snapshot.articles || []).find(a => a.id === articleId);
        if (art) {
            return {
                timestamp: snapshot.timestamp,
                views: art.views,
                likes: art.likes,
                comments: art.comments
            };
        }
        return null;
    }).filter(item => item !== null);

    return {
        props: {
            article,
            history: articleHistory,
            latestTimestamp: latestSnapshot.timestamp || null
        }
    };
}
