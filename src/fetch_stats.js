import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// --- Configuration ---
const COOKIE = process.env.SSPAI_COOKIE;
const SLUG = process.env.SSPAI_SLUG;
const HISTORY_FILE = path.join(__dirname, '../data/history.json');
const CURRENT_STATS_FILE = path.join(__dirname, '../data/current_stats.json'); // Snapshot for easy checking
// ---

if (!SLUG) {
    console.error('Error: SSPAI_SLUG environment variable is required.');
    process.exit(1);
}

if (!COOKIE) {
    console.warn('Warning: SSPAI_COOKIE is not set. View counts will likely be 0.');
}

// Helper to extract JWT from cookie string
function getJwtFromCookie(cookieStr) {
    if (!cookieStr) return null;
    const match = cookieStr.match(/sspai_jwt_token=([^;]+)/);
    return match ? match[1] : null;
}

const JWT = getJwtFromCookie(COOKIE);

if (!JWT) {
    console.warn('Warning: Could not extract sspai_jwt_token from cookie. Auth header will be missing.');
}

// Helper to make HTTPS requests
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Authorization': `Bearer ${JWT}`,
                'Connection': 'keep-alive',
                'Cookie': COOKIE || '',
                'Referer': 'https://sspai.com/my/post/publish',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

// Fetch all articles for the user (handling pagination)
async function fetchAllArticles() {
    const limit = 20;
    let offset = 0;
    let allArticles = [];
    let hasMore = true;

    console.log(`Fetching authenticated articles...`);

    while (hasMore) {
        // Correct Endpoint: Matrix Editor API
        const timestamp = Math.floor(Date.now() / 1000);
        // User saw "type=5" in their console. Let's try to trust it, but if it returns empty, we log why.
        const url = `https://sspai.com/api/v1/matrix/editor/article/self/page/get?limit=${limit}&offset=${offset}&type=5&created_at=${timestamp}`;
        try {
            const response = await fetchUrl(url);

            if (!response.data || response.data.length === 0) {
                console.log("Empty Data received. Raw Response:", JSON.stringify(response, null, 2));
                // Try fallback to type=1 (Published?)
                if (url.includes('type=5')) {
                    console.log("Retrying with type=1...");
                    const url2 = url.replace('type=5', 'type=1');
                    const res2 = await fetchUrl(url2);
                    if (res2.data && res2.data.length > 0) {
                        console.log("Found articles with type=1!");
                        response.data = res2.data;
                    }
                }
            }

            if (!response.data || response.data.length === 0) {
                hasMore = false;
                break;
            }

            const articles = response.data;
            allArticles = allArticles.concat(articles);
            console.log(`  Fetched ${articles.length} articles (Total so far: ${allArticles.length})`);

            // FOR TESTING: Stop after 1 page
            if (articles.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }

            // Be nice to the API
            await new Promise(r => setTimeout(r, 500));

        } catch (e) {
            console.error('Error fetching page:', e);
            hasMore = false;
        }
    }

    return allArticles;
}

// Helper to ensure avatar URL is absolute
function normalizeAvatarUrl(url) {
    if (!url) return 'https://cdn.sspai.com/static/avatar/default.png';
    if (url.startsWith('http')) return url;
    return `https://cdnfile.sspai.com/${url}`;
}

// Fetch public user info (nickname, avatar)
async function fetchUserInfo(slug) {
    console.log(`Fetching public info for user: ${slug}...`);
    try {
        const url = `https://sspai.com/api/v1/user/slug/info/get?slug=${slug}`;
        const response = await fetchUrl(url);
        if (response.error === 0 && response.data) {
            return {
                nickname: response.data.nickname,
                avatar: normalizeAvatarUrl(response.data.avatar)
            };
        }
    } catch (e) {
        console.error('Error fetching user info:', e);
    }
    return { nickname: slug, avatar: '' };
}

async function main() {
    try {
        const userInfo = await fetchUserInfo(SLUG);
        const articles = await fetchAllArticles();
        console.log(`\nTotal articles found: ${articles.length}`);

        // Phase 5: Deep Analytics - Fetch tags, editor, and comment likes for each article
        const detailedArticles = [];
        console.log(`\nFetching deep analytics for each article (this may take a moment)...`);

        for (const art of articles) {
            console.log(`  Deep dive: ${art.title} (ID: ${art.id})`);

            let tags = [];
            let editor = null;
            let commentLikesTotal = 0;
            let topComments = [];

            try {
                // 1. Fetch Article Info (Tags & Editor)
                const infoUrl = `https://sspai.com/api/v1/article/info/get?id=${art.id}&support_webp=true&view=second`;
                const infoRes = await fetchUrl(infoUrl);
                if (infoRes.error === 0 && infoRes.data) {
                    tags = infoRes.data.tags ? infoRes.data.tags.map(t => t.title) : [];
                    // Fix: Use article_follow_up_admin for "Editor" (责编), using object structure
                    if (infoRes.data.article_follow_up_admin) {
                        editor = {
                            nickname: infoRes.data.article_follow_up_admin.nickname,
                            slug: infoRes.data.article_follow_up_admin.slug
                        };
                    } else {
                        editor = null;
                    }
                }

                // 2. Fetch Hot Comments (to count interaction likes and get top comments)
                const commentUrl = `https://sspai.com/api/v1/comment/user/article/hot/page/get?limit=50&offset=0&article_id=${art.id}&flag_model=1`;
                const commentRes = await fetchUrl(commentUrl);
                if (commentRes.error === 0 && commentRes.data) {
                    commentLikesTotal = commentRes.data.reduce((sum, c) => sum + (c.likes_count || 0), 0);

                    // Sort by likes and take top 3
                    topComments = commentRes.data
                        .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
                        .slice(0, 3)
                        .map(c => ({
                            nickname: c.user?.nickname || 'Unknown',
                            avatar: normalizeAvatarUrl(c.user?.avatar || ''),
                            content: c.comment,
                            likes: c.likes_count || 0
                        }));
                }
            } catch (e) {
                console.warn(`    Failed to fetch deep stats for ${art.id}: ${e.message}`);
            }

            detailedArticles.push({
                ...art,
                tags,
                editor,
                comment_likes_total: commentLikesTotal,
                top_comments: topComments
            });

            // Be nice: 500ms delay between articles
            await new Promise(r => setTimeout(r, 500));
        }

        const now = new Date().toISOString();

        // 1. Calculate Aggregates
        const totalViews = detailedArticles.reduce((sum, art) => sum + (art.view_count || 0), 0);
        const totalLikes = detailedArticles.reduce((sum, art) => sum + (art.like_count || 0), 0);
        const totalComments = detailedArticles.reduce((sum, art) => sum + (art.comment_count || 0), 0);
        const articleCount = detailedArticles.length;

        const statsEntry = {
            timestamp: now,
            user: userInfo,
            totals: {
                article_count: articleCount,
                views: totalViews,
                likes: totalLikes,
                comments: totalComments
            },
            articles: detailedArticles.map(art => ({
                id: art.id,
                title: art.title,
                views: art.view_count,
                likes: art.like_count,
                comments: art.comment_count,
                created_at: art.created_time,
                tags: art.tags,
                editor: art.editor,
                top_comments: art.top_comments
            }))
        };

        console.log('Stats Summary:', statsEntry.totals);

        // 2. Update History File
        let history = [];
        if (fs.existsSync(HISTORY_FILE)) {
            try {
                history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            } catch (e) {
                console.warn('Could not parse existing history, starting fresh.');
            }
        }

        history.push(statsEntry);

        // Write back history
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        console.log(`Updated ${HISTORY_FILE}`);

        // 3. Write detailed snapshot
        fs.writeFileSync(CURRENT_STATS_FILE, JSON.stringify(detailedArticles, null, 2));
        console.log(`Updated ${CURRENT_STATS_FILE}`);

    } catch (err) {
        console.error('Main execution failed:', err);
        process.exit(1);
    }
}

main();
