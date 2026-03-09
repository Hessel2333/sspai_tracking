import dayjs from 'dayjs';

export const CRON_DENSE = '30 * * * *';
export const CRON_SPARSE = '30 */6 * * *';

const NEW_POST_DENSE_HOURS = 24 * 7;
const SURGE_LOOKBACK_HOURS = 72;
const MAX_INTERVAL_HOURS_FOR_SURGE = 36;
const DENSE_TRIGGER_ABS_VIEWS = 160;
const DENSE_TRIGGER_RATE_PER_24H = 180;
const DENSE_RELEASE_RATE_PER_24H = 60;

function getSnapshotTimestamp(snapshot) {
    return snapshot?.timestamp ? new Date(snapshot.timestamp).getTime() : NaN;
}

function getLatestArticle(snapshot) {
    const articles = Array.isArray(snapshot?.articles) ? snapshot.articles : [];
    if (articles.length === 0) return null;
    return articles.reduce((latest, article) => {
        if (!latest) return article;
        return Number(article?.created_at || 0) > Number(latest?.created_at || 0) ? article : latest;
    }, null);
}

function buildArticleViewsMap(snapshot) {
    return new Map(
        (Array.isArray(snapshot?.articles) ? snapshot.articles : []).map((article) => [
            Number(article.id),
            {
                id: Number(article.id),
                title: article.title,
                views: Number(article.views || article.view_count || 0)
            }
        ])
    );
}

function computeIntervalGrowth(previousSnapshot, nextSnapshot) {
    const previousTs = getSnapshotTimestamp(previousSnapshot);
    const nextTs = getSnapshotTimestamp(nextSnapshot);
    if (!Number.isFinite(previousTs) || !Number.isFinite(nextTs) || nextTs <= previousTs) {
        return null;
    }

    const hours = (nextTs - previousTs) / (1000 * 60 * 60);
    if (!Number.isFinite(hours) || hours <= 0) {
        return null;
    }

    const previousViews = buildArticleViewsMap(previousSnapshot);
    let topGrowth = {
        articleId: null,
        articleTitle: null,
        deltaViews: 0,
        ratePer24h: 0
    };

    for (const article of Array.isArray(nextSnapshot?.articles) ? nextSnapshot.articles : []) {
        const articleId = Number(article.id);
        const currentViews = Number(article.views || article.view_count || 0);
        const priorViews = previousViews.get(articleId)?.views || 0;
        const deltaViews = currentViews - priorViews;
        if (deltaViews <= topGrowth.deltaViews) continue;

        topGrowth = {
            articleId,
            articleTitle: article.title,
            deltaViews,
            ratePer24h: (deltaViews / hours) * 24
        };
    }

    return {
        hours,
        from: previousSnapshot.timestamp,
        to: nextSnapshot.timestamp,
        ...topGrowth
    };
}

function getRecentGrowth(history, currentSnapshot) {
    const currentTs = getSnapshotTimestamp(currentSnapshot);
    if (!Number.isFinite(currentTs)) return null;

    const eligibleHistory = [...(Array.isArray(history) ? history : [])]
        .filter((snapshot) => {
            const snapshotTs = getSnapshotTimestamp(snapshot);
            if (!Number.isFinite(snapshotTs) || snapshotTs >= currentTs) return false;
            const ageHours = (currentTs - snapshotTs) / (1000 * 60 * 60);
            return ageHours <= SURGE_LOOKBACK_HOURS;
        })
        .sort((a, b) => getSnapshotTimestamp(a) - getSnapshotTimestamp(b));

    const recentSnapshots = [...eligibleHistory.slice(-3), currentSnapshot];
    if (recentSnapshots.length < 2) return null;

    let bestGrowth = null;
    for (let index = 1; index < recentSnapshots.length; index += 1) {
        const growth = computeIntervalGrowth(recentSnapshots[index - 1], recentSnapshots[index]);
        if (!growth) continue;
        if (!bestGrowth || growth.ratePer24h > bestGrowth.ratePer24h) {
            bestGrowth = growth;
        }
    }

    return bestGrowth;
}

export function evaluateSamplingPolicy({ currentSnapshot, history = [], currentCron = null, now = new Date() }) {
    const latestArticle = getLatestArticle(currentSnapshot);
    const latestArticleCreatedAt = latestArticle?.created_at ? dayjs.unix(latestArticle.created_at) : null;
    const latestArticleAgeHours = latestArticleCreatedAt
        ? dayjs(now).diff(latestArticleCreatedAt, 'hour', true)
        : Infinity;
    const recentGrowth = getRecentGrowth(history, currentSnapshot);

    const isNewPostWeek = latestArticleAgeHours <= NEW_POST_DENSE_HOURS;
    const hasViewSurge = Boolean(
        recentGrowth
        && recentGrowth.hours <= MAX_INTERVAL_HOURS_FOR_SURGE
        && (
            recentGrowth.deltaViews >= DENSE_TRIGGER_ABS_VIEWS
            || recentGrowth.ratePer24h >= DENSE_TRIGGER_RATE_PER_24H
        )
    );
    const keepDenseForOngoingGrowth = Boolean(
        currentCron === CRON_DENSE
        && recentGrowth
        && recentGrowth.hours <= MAX_INTERVAL_HOURS_FOR_SURGE
        && recentGrowth.ratePer24h >= DENSE_RELEASE_RATE_PER_24H
    );

    const mode = (isNewPostWeek || hasViewSurge || keepDenseForOngoingGrowth) ? 'dense' : 'sparse';
    const reasons = [];

    if (isNewPostWeek && latestArticle) {
        reasons.push(`new-post-week:${latestArticle.id}`);
    }
    if (hasViewSurge && recentGrowth?.articleId) {
        reasons.push(`view-surge:${recentGrowth.articleId}`);
    }
    if (!hasViewSurge && keepDenseForOngoingGrowth && recentGrowth?.articleId) {
        reasons.push(`cooldown-hold:${recentGrowth.articleId}`);
    }
    if (reasons.length === 0) {
        reasons.push('baseline-sparse');
    }

    return {
        mode,
        cron: mode === 'dense' ? CRON_DENSE : CRON_SPARSE,
        reasons,
        latestArticle: latestArticle
            ? {
                id: latestArticle.id,
                title: latestArticle.title,
                created_at: latestArticle.created_at,
                ageHours: Number.isFinite(latestArticleAgeHours) ? Number(latestArticleAgeHours.toFixed(1)) : null
            }
            : null,
        recentGrowth: recentGrowth
            ? {
                ...recentGrowth,
                hours: Number(recentGrowth.hours.toFixed(2)),
                ratePer24h: Number(recentGrowth.ratePer24h.toFixed(1))
            }
            : null
    };
}

export function shouldPersistHistory({ policy, lastSavedTimestamp, now = new Date(), forceSave = false }) {
    if (forceSave) {
        return { shouldPersist: true, reason: 'force-save' };
    }

    if (!lastSavedTimestamp) {
        return { shouldPersist: true, reason: 'history-empty' };
    }

    const lastSavedAt = dayjs(lastSavedTimestamp);
    const elapsedHours = dayjs(now).diff(lastSavedAt, 'hour', true);
    const requiredGapHours = policy?.mode === 'dense' ? 1 : 6;

    if (elapsedHours >= requiredGapHours * 0.9) {
        return {
            shouldPersist: true,
            reason: `${policy?.mode || 'sparse'}-interval-reached`
        };
    }

    return {
        shouldPersist: false,
        reason: `${policy?.mode || 'sparse'}-interval-not-reached`
    };
}
