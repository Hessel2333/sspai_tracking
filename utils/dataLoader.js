import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const CURRENT_FILE = path.join(DATA_DIR, 'current_stats.json');
const PERSONA_FILE = path.join(DATA_DIR, 'persona.json');
const DEFAULT_AVATAR_URL = 'https://cdn.sspai.com/static/avatar/default.png';

function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Failed to read JSON: ${filePath}`, error);
        return fallback;
    }
}

function normalizeTotals(snapshot) {
    const articles = Array.isArray(snapshot?.articles) ? snapshot.articles : [];
    const fallbackTotals = articles.reduce((acc, article) => {
        acc.views += Number(article.views || article.view_count || 0);
        acc.likes += Number(article.likes || article.like_count || 0);
        acc.comments += Number(article.comments || article.comment_count || 0);
        return acc;
    }, { views: 0, likes: 0, comments: 0 });

    const totals = snapshot?.totals || {};
    return {
        views: Number(totals.views ?? snapshot?.total_views ?? fallbackTotals.views ?? 0),
        likes: Number(totals.likes ?? snapshot?.total_likes ?? fallbackTotals.likes ?? 0),
        comments: Number(totals.comments ?? snapshot?.total_comments ?? fallbackTotals.comments ?? 0),
        article_count: Number(totals.article_count ?? snapshot?.article_count ?? articles.length ?? 0)
    };
}

function normalizeHealth(snapshot) {
    const health = snapshot?.health || {};
    const cookieStatus = health.cookie_status || snapshot?.cookie_status || 'unknown';
    return {
        cookie_status: cookieStatus,
        api_fallback: Boolean(health.api_fallback),
        errors: Array.isArray(health.errors) ? health.errors : []
    };
}

function normalizeAvatarUrl(url) {
    if (!url) return DEFAULT_AVATAR_URL;
    if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://');
    if (url.startsWith('https://')) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    return `https://cdnfile.sspai.com/${clean}`;
}

function normalizeUserData(user) {
    if (!user || typeof user !== 'object') return null;

    const normalized = { ...user };
    normalized.avatar = normalizeAvatarUrl(normalized.avatar);

    const engagement = user.engagement;
    if (!engagement || typeof engagement !== 'object') return normalized;

    const normalizedEngagement = { ...engagement };

    if (engagement.following?.list) {
        normalizedEngagement.following = {
            ...engagement.following,
            list: engagement.following.list.map((item) => ({
                ...item,
                avatar: normalizeAvatarUrl(item.avatar)
            }))
        };
    }

    if (engagement.followers?.list) {
        normalizedEngagement.followers = {
            ...engagement.followers,
            list: engagement.followers.list.map((item) => ({
                ...item,
                avatar: normalizeAvatarUrl(item.avatar)
            }))
        };
    }

    if (engagement.favorites?.list) {
        normalizedEngagement.favorites = {
            ...engagement.favorites,
            list: engagement.favorites.list.map((item) => ({
                ...item,
                author: item.author
                    ? { ...item.author, avatar: normalizeAvatarUrl(item.author.avatar) }
                    : item.author
            }))
        };
    }

    if (Array.isArray(engagement.all_activities)) {
        normalizedEngagement.all_activities = engagement.all_activities.map((item) => ({
            ...item,
            author_avatar: item.author_avatar ? normalizeAvatarUrl(item.author_avatar) : item.author_avatar
        }));
    }

    if (engagement.social_dna?.author_matrix) {
        normalizedEngagement.social_dna = {
            ...engagement.social_dna,
            author_matrix: engagement.social_dna.author_matrix.map((item) => ({
                ...item,
                avatar: normalizeAvatarUrl(item.avatar)
            }))
        };
    }

    normalized.engagement = normalizedEngagement;
    return normalized;
}

export function normalizeSnapshot(snapshot = {}) {
    const normalized = {
        ...snapshot,
        timestamp: snapshot?.timestamp || null,
        user: normalizeUserData(snapshot?.user || null),
        articles: Array.isArray(snapshot?.articles) ? snapshot.articles : [],
        totals: normalizeTotals(snapshot),
        health: normalizeHealth(snapshot)
    };

    // Keep backward-compatible top-level flag for existing UI.
    normalized.cookie_status = normalized.health.cookie_status;
    return normalized;
}

export function loadHistory() {
    const raw = readJsonSafe(HISTORY_FILE, []);
    return Array.isArray(raw) ? raw.map(normalizeSnapshot) : [];
}

export function loadCurrentStats() {
    const raw = readJsonSafe(CURRENT_FILE, null);
    return raw ? normalizeSnapshot(raw) : null;
}

export function loadPersona() {
    return readJsonSafe(PERSONA_FILE, null);
}

function dedupeAppendSnapshot(snapshots, current) {
    if (!current?.timestamp) return snapshots;
    if (snapshots.length === 0) return [...snapshots, current];
    const tail = snapshots[snapshots.length - 1];
    // Prefer the current snapshot when timestamps match, because history entries
    // are slimmed down and may omit heavy engagement data.
    if (tail?.timestamp === current.timestamp) {
        return [...snapshots.slice(0, -1), current];
    }
    return [...snapshots, current];
}

function deriveTopTags(articles) {
    const counts = {};
    articles.forEach((article) => {
        if (!Array.isArray(article?.tags)) return;
        article.tags.forEach((tag) => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function deriveTopEditors(articles) {
    const counts = {};
    articles.forEach((article) => {
        if (!article?.editor) return;
        const name = typeof article.editor === 'object' ? article.editor.nickname : article.editor;
        const slug = typeof article.editor === 'object' ? article.editor.slug : null;
        if (!name) return;

        if (!counts[name]) counts[name] = { count: 0, slug: slug || null };
        counts[name].count += 1;
        if (slug && !counts[name].slug) counts[name].slug = slug;
    });

    return Object.entries(counts)
        .map(([name, data]) => ({ name, count: data.count, slug: data.slug }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

export function loadDashboardData() {
    const history = loadHistory();
    const current = loadCurrentStats();
    const combined = current ? dedupeAppendSnapshot(history, current) : history;
    const latest = combined.length > 0 ? combined[combined.length - 1] : normalizeSnapshot({});
    const previous = combined.length > 1 ? combined[combined.length - 2] : null;

    const userData = latest.user || null;
    const topTags = deriveTopTags(latest.articles);
    const topEditors = deriveTopEditors(latest.articles);

    return {
        history: combined,
        latest,
        previous,
        latestTimestamp: latest.timestamp,
        topTags,
        topEditors,
        userData,
        personaData: loadPersona()
    };
}

export function loadActivitiesData() {
    const current = loadCurrentStats();
    if (current?.user?.engagement?.all_activities) {
        return {
            userData: current.user,
            latestTimestamp: current.timestamp
        };
    }

    const history = loadHistory();
    const latest = history.length > 0 ? history[history.length - 1] : null;
    return {
        userData: latest?.user || null,
        latestTimestamp: latest?.timestamp || null
    };
}

export function loadArticlePaths() {
    const history = loadHistory();
    const current = loadCurrentStats();
    const combined = current ? dedupeAppendSnapshot(history, current) : history;
    const latest = combined.length > 0 ? combined[combined.length - 1] : normalizeSnapshot({});

    return (latest.articles || []).map((article) => ({
        params: { id: String(article.id) }
    }));
}

export function loadArticleData(articleId) {
    const history = loadHistory();
    const current = loadCurrentStats();
    const combined = current ? dedupeAppendSnapshot(history, current) : history;
    const latest = combined.length > 0 ? combined[combined.length - 1] : normalizeSnapshot({});

    const article = (latest.articles || []).find((item) => Number(item.id) === Number(articleId)) || null;
    const articleHistory = combined
        .map((snapshot) => {
            const target = (snapshot.articles || []).find((item) => Number(item.id) === Number(articleId));
            if (!target) return null;
            return {
                timestamp: snapshot.timestamp,
                views: Number(target.views || 0),
                likes: Number(target.likes || 0),
                comments: Number(target.comments || 0)
            };
        })
        .filter(Boolean);

    return {
        article,
        history: articleHistory,
        latestTimestamp: latest.timestamp || null
    };
}
