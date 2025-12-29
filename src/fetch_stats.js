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
        const json = await fetchUrl(url);
        if (json.error === 0 && json.data) {
            const baseInfo = {
                nickname: json.data.nickname,
                avatar: normalizeAvatarUrl(json.data.avatar),
                slug: json.data.slug,
                // Achievements Data
                created_at: json.data.created_at, // Joined timestamp
                liked_count: json.data.liked_count, // Total charging (获得充电)
                article_view_count: json.data.article_view_count, // Total views (Official stat)
                article_count: json.data.released_article_count, // Total articles (Official stat)
                user_reward_badges: json.data.user_reward_badges || [] // Badges
            };

            // Fetch Additional Engagement Data
            console.log(`  Fetching full engagement data...`);

            // 1. Following (Paginated)
            let allFollowing = [];
            let followOffset = 0;
            const followLimit = 20;
            let followTotal = 0;

            try {
                const firstFollowRes = await fetchUrl(`https://sspai.com/api/v1/user/follow/page/get?limit=${followLimit}&offset=0&slug=${slug}`);
                followTotal = firstFollowRes.total || 0;
                allFollowing = firstFollowRes.data || [];

                while (allFollowing.length < followTotal) {
                    followOffset += followLimit;
                    const res = await fetchUrl(`https://sspai.com/api/v1/user/follow/page/get?limit=${followLimit}&offset=${followOffset}&slug=${slug}`);
                    if (!res.data || res.data.length === 0) break;
                    allFollowing = allFollowing.concat(res.data);
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (e) { console.error("Following fetch error:", e); }

            const following = {
                total: followTotal,
                list: allFollowing.slice(0, 5).map(u => ({
                    nickname: u.nickname,
                    slug: u.slug,
                    avatar: normalizeAvatarUrl(u.avatar)
                }))
            };

            // 2. Activities (Paginated)
            let allActivities = [];
            let activityOffset = 0;
            const activityLimit = 20;
            let activityTotal = 0;

            try {
                const firstActivityRes = await fetchUrl(`https://sspai.com/api/v1/information/user/activity/page/get?limit=${activityLimit}&offset=0&slug=${slug}`);
                activityTotal = firstActivityRes.total || 0;
                allActivities = firstActivityRes.data || [];

                while (allActivities.length < activityTotal) {
                    activityOffset += activityLimit;
                    const res = await fetchUrl(`https://sspai.com/api/v1/information/user/activity/page/get?limit=${activityLimit}&offset=${activityOffset}&slug=${slug}`);
                    if (!res.data || res.data.length === 0) break;
                    allActivities = allActivities.concat(res.data);
                    await new Promise(r => setTimeout(r, 300));
                    if (allActivities.length >= 2000) break; // Increased safety cap
                }
            } catch (e) { console.error("Activity fetch error:", e); }

            const engagement = {
                following,
                likes_given_total: allActivities.filter(a => a.key === 'like_article').length,
                comments_made_total: allActivities.filter(a => ['comment_article', 'community_comment_topic', 'community_reply_topic_comment', 'community_comment_topic_comment'].includes(a.key)).length,
                all_activities: allActivities.map(a => {
                    let commentContent = a.data?.comment || null;
                    if (commentContent && typeof commentContent === 'object') {
                        commentContent = commentContent.body || commentContent.content || null;
                    }

                    return {
                        key: a.key,
                        action: a.action,
                        created_at: a.created_at,
                        target_title: a.data?.title || a.data?.article_title || a.data?.topic?.title || a.data?.topic?.content || a.data?.content || null,
                        target_id: a.data?.id || a.data?.article_id || a.data?.topic?.id || null,
                        target_slug: a.data?.slug || a.data?.article_slug || null,
                        comment_content: commentContent,
                        type: a.key.includes('topic') ? 'topic' : 'article',
                        author: a.data?.author?.nickname || a.data?.article_author_nickname || null,
                        author_slug: a.data?.author?.slug || a.data?.article_author_slug || null,
                        author_avatar: a.data?.author?.avatar || a.data?.article_author_avatar || null,
                        tags: a.data?.tags || []
                    };
                })
            };

            // --- Aggregate Social DNA & Author Matrix ---
            const socialTags = {};
            const authorMatrix = {};
            const uniqueArticleIds = new Set();
            const uniqueAuthorSlugs = new Set();

            engagement.all_activities.forEach(act => {
                if (act.type === 'article' && act.target_id) uniqueArticleIds.add(act.target_id);
                if (act.author_slug) uniqueAuthorSlugs.add(act.author_slug);
            });

            // Metadata cache
            const articleMetadata = {};
            const authorMetadata = {};

            console.log(`  Fetching metadata for ${Math.min(uniqueArticleIds.size, 50)} articles and unique authors...`);

            // 1. Fetch Article Metadata (for tags)
            let artMetaCount = 0;
            for (const id of uniqueArticleIds) {
                if (artMetaCount >= 50) break;
                try {
                    const res = await fetchUrl(`https://sspai.com/api/v1/article/info/get?id=${id}`);
                    if (res.data) {
                        articleMetadata[id] = {
                            tags: res.data.tags || [],
                            author: res.data.author
                        };
                        // Prefill author cache if we got it
                        if (res.data.author?.slug) {
                            authorMetadata[res.data.author.slug] = {
                                nickname: res.data.author.nickname,
                                avatar: res.data.author.avatar
                            };
                        }
                    }
                    artMetaCount++;
                    if (artMetaCount % 10 === 0) await new Promise(r => setTimeout(r, 100));
                } catch (e) { }
            }

            // 2. Fetch Author Metadata fallbacks (if needed)
            for (const aSlug of uniqueAuthorSlugs) {
                if (authorMetadata[aSlug] || aSlug === slug) continue;
                try {
                    const res = await fetchUrl(`https://sspai.com/api/v1/user/slug/info/get?slug=${aSlug}`);
                    if (res.data) {
                        authorMetadata[aSlug] = {
                            nickname: res.data.nickname,
                            avatar: res.data.avatar
                        };
                    }
                    await new Promise(r => setTimeout(r, 50));
                } catch (e) { }
            }

            engagement.all_activities.forEach(act => {
                const metaArt = act.type === 'article' ? articleMetadata[act.target_id] : null;
                const metaAuth = authorMetadata[act.author_slug] || metaArt?.author || null;

                const tags = (act.tags && act.tags.length > 0) ? act.tags : (metaArt?.tags || []);
                const author = act.author || metaAuth?.nickname || null;
                const author_slug = act.author_slug || metaAuth?.slug || null;
                const author_avatar = (act.author_avatar || metaAuth?.avatar || null);

                // Tags
                if (tags && Array.isArray(tags)) {
                    tags.forEach(tag => {
                        const tagName = typeof tag === 'object' ? tag.title : tag;
                        socialTags[tagName] = (socialTags[tagName] || 0) + 1;
                    });
                }
                // Authors (Filter out self)
                if (author && author !== baseInfo.nickname && author_slug !== slug) {
                    if (!authorMatrix[author]) {
                        authorMatrix[author] = {
                            count: 0,
                            slug: author_slug,
                            avatar: author_avatar ? normalizeAvatarUrl(author_avatar) : null
                        };
                    }
                    authorMatrix[author].count += 1;
                }
            });

            engagement.social_dna = {
                top_tags: Object.entries(socialTags)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                author_matrix: Object.entries(authorMatrix)
                    .map(([name, data]) => ({ name, count: data.count, slug: data.slug, avatar: data.avatar }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 15)
            };

            return { ...baseInfo, engagement };
        }
    } catch (e) {
        console.error('Error fetching user info:', e);
    }
    return { nickname: slug, avatar: '', engagement: {} };
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
