import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const CURRENT_FILE = path.join(DATA_DIR, 'current_stats.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function fail(errors) {
    console.error('Stats validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function parseJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateCurrentStats(stats) {
    const errors = [];

    if (!stats || typeof stats !== 'object') {
        errors.push('current_stats.json root must be an object.');
        return errors;
    }

    if (!stats.timestamp || Number.isNaN(Date.parse(stats.timestamp))) {
        errors.push('timestamp must be a valid ISO date string.');
    }

    if (!Array.isArray(stats.articles)) {
        errors.push('articles must be an array.');
    }

    if (!stats.totals || typeof stats.totals !== 'object') {
        errors.push('totals must be an object.');
    } else {
        ['views', 'likes', 'comments', 'article_count'].forEach((key) => {
            if (!isFiniteNumber(stats.totals[key]) || stats.totals[key] < 0) {
                errors.push(`totals.${key} must be a non-negative number.`);
            }
        });
    }

    if (!stats.health || typeof stats.health !== 'object') {
        errors.push('health must be an object.');
    } else {
        const allowedCookieStatus = new Set(['valid', 'expired', 'missing', 'unknown']);
        if (!allowedCookieStatus.has(stats.health.cookie_status)) {
            errors.push('health.cookie_status must be one of valid/expired/missing/unknown.');
        }
        if (typeof stats.health.api_fallback !== 'boolean') {
            errors.push('health.api_fallback must be a boolean.');
        }
        if (!Array.isArray(stats.health.errors)) {
            errors.push('health.errors must be an array.');
        }
    }

    if (Array.isArray(stats.articles) && stats.totals) {
        const computed = stats.articles.reduce((acc, article) => {
            const views = Number(article?.views || 0);
            const likes = Number(article?.likes || 0);
            const comments = Number(article?.comments || 0);

            if (!isFiniteNumber(views) || !isFiniteNumber(likes) || !isFiniteNumber(comments)) {
                errors.push(`article ${article?.id || 'unknown'} has invalid numeric stats.`);
                return acc;
            }

            acc.views += views;
            acc.likes += likes;
            acc.comments += comments;
            acc.count += 1;
            return acc;
        }, { views: 0, likes: 0, comments: 0, count: 0 });

        if (stats.totals.article_count !== computed.count) {
            errors.push(`totals.article_count (${stats.totals.article_count}) does not match article length (${computed.count}).`);
        }
        if (stats.totals.views !== computed.views) {
            errors.push(`totals.views (${stats.totals.views}) does not match computed views (${computed.views}).`);
        }
        if (stats.totals.likes !== computed.likes) {
            errors.push(`totals.likes (${stats.totals.likes}) does not match computed likes (${computed.likes}).`);
        }
        if (stats.totals.comments !== computed.comments) {
            errors.push(`totals.comments (${stats.totals.comments}) does not match computed comments (${computed.comments}).`);
        }
    }

    return errors;
}

function validateHistory(history, currentTimestamp) {
    const errors = [];
    if (!Array.isArray(history)) {
        errors.push('history.json must be an array.');
        return errors;
    }
    if (history.length === 0) return errors;

    const last = history[history.length - 1];
    if (!last?.timestamp || Number.isNaN(Date.parse(last.timestamp))) {
        errors.push('history latest entry timestamp is invalid.');
    }
    if (last?.timestamp && currentTimestamp && Date.parse(last.timestamp) > Date.parse(currentTimestamp)) {
        errors.push('history latest timestamp is newer than current_stats timestamp.');
    }

    return errors;
}

try {
    const currentStats = parseJsonFile(CURRENT_FILE);
    const history = fs.existsSync(HISTORY_FILE) ? parseJsonFile(HISTORY_FILE) : [];

    const errors = [
        ...validateCurrentStats(currentStats),
        ...validateHistory(history, currentStats.timestamp)
    ];

    if (errors.length > 0) fail(errors);

    console.log('Stats validation passed.');
    console.log(`- Timestamp: ${currentStats.timestamp}`);
    console.log(`- Articles: ${currentStats.articles.length}`);
    console.log(`- Totals: views=${currentStats.totals.views}, likes=${currentStats.totals.likes}, comments=${currentStats.totals.comments}`);
    process.exit(0);
} catch (error) {
    fail([error.message]);
}
