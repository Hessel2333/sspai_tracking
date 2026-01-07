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
const METADATA_CACHE_FILE = path.join(__dirname, '../data/metadata_cache.json'); // Persistent metadata cache
// ---

if (!SLUG) {
    console.error('Error: SSPAI_SLUG is not set in environment variables.');
    process.exit(1);
} else {
    console.log(`Using SSPAI_SLUG: ${SLUG}`);
}

if (!COOKIE) {
    console.warn('Warning: SSPAI_COOKIE is not set. View counts will likely be 0.');
} else {
    console.log('SSPAI_COOKIE is present (length: ' + COOKIE.length + ')');
}

// Global flag to track cookie health
global.COOKIE_STATUS = 'valid';

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

// Fetch all articles for the user
// Strategy: Try Private API (for View Counts) -> Fallback to Public API (Robustness)
async function fetchAllArticles() {
    const limit = 20;
    const timestamp = Math.floor(Date.now() / 1000);
    let allArticles = [];

    // 1. Attempt Private Matrix API (to get View Counts)
    console.log('Attempting to fetch via Private Matrix API (to get View Counts)...');
    try {
        let offset = 0;
        let hasMore = true;
        let privateArticles = [];
        let fetchedAny = false;

        while (hasMore) {
            // type=5 usually means "Published" in Matrix
            const url = `https://sspai.com/api/v1/matrix/editor/article/self/page/get?limit=${limit}&offset=${offset}&type=5&created_at=${timestamp}`;
            console.log(`  Private Fetch: ${url}`);
            const res = await fetchUrl(url);

            if (res.error === 0 && res.data && res.data.length > 0) {
                privateArticles = privateArticles.concat(res.data);
                fetchedAny = true;
                if (res.data.length < limit) hasMore = false;
                else await new Promise(r => setTimeout(r, 500));
                offset += limit;
            } else {
                // If 0 data on FIRST page, assume failure or no published articles visible to private API
                if (!fetchedAny) {
                    throw new Error('Private API returned empty list on first page.');
                }
                hasMore = false;
            }
        }

        console.log(`  ✅ Successfully fetched ${privateArticles.length} articles via Private API. Views data available.`);
        return privateArticles;

    } catch (e) {
        console.warn('  ⚠️ Private API failed/empty. Cookie might be invalid or expired.', e.message);
        console.log('  -> Switching to Public Profile API (Views will be 0, but lists/likes valid).');
        global.COOKIE_STATUS = 'expired'; // Mark as expired
    }

    // 2. Fallback to Public API
    try {
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const url = `https://sspai.com/api/v1/article/user/public/page/get?limit=${limit}&offset=${offset}&slug=${SLUG}&created_at=${timestamp}&object_type=0`;
            console.log(`  Public Fetch: ${url}`);
            const res = await fetchUrl(url);

            if (res.error !== 0) {
                console.error('  Public API Error:', res.msg);
                break;
            }

            if (!res.data || res.data.length === 0) {
                hasMore = false;
                break;
            }

            allArticles = allArticles.concat(res.data);
            if (res.data.length < limit) hasMore = false;
            else {
                offset += limit;
                await new Promise(r => setTimeout(r, 500));
            }
        }
    } catch (e) {
        console.error('  Public API failed:', e);
    }

    console.log(`  Fetched ${allArticles.length} articles via Public API.`);
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
                user_reward_badges: json.data.user_reward_badges || [], // Badges
                bio: json.data.bio || json.data.signature || '' // User Bio
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

            // 1.5 Followers (Paginated) - NEW
            let allFollowers = [];
            let followerOffset = 0;
            const followerLimit = 20;
            let followerTotal = 0;

            try {
                // Determine API endpoint for followers (Assuming /user/fan/page/get based on similar APIs or standard naming)
                // Note: If exact API is unknown, I'm inferring from typical patterns. 
                // SSPAI usually pairs 'follow' with 'fan' or 'follower'. Let's try 'fan'.
                const firstFollowerRes = await fetchUrl(`https://sspai.com/api/v1/user/fan/page/get?limit=${followerLimit}&offset=0&slug=${slug}`);
                followerTotal = firstFollowerRes.total || 0;
                allFollowers = firstFollowerRes.data || [];

                // Limit deeper fetching for followers to save time, we mostly need the count
                // fetching first 100 is enough for a sample
                while (allFollowers.length < Math.min(followerTotal, 100)) {
                    followerOffset += followerLimit;
                    const res = await fetchUrl(`https://sspai.com/api/v1/user/fan/page/get?limit=${followerLimit}&offset=${followerOffset}&slug=${slug}`);
                    if (!res.data || res.data.length === 0) break;
                    // Filter duplicates manually if needed, but simple concat is fast
                    allFollowers = allFollowers.concat(res.data);
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (e) { console.error("Follower fetch error:", e); }

            const followers = {
                total: followerTotal,
                list: allFollowers.slice(0, 5).map(u => ({
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

            // 3. Favorites (Paginated)
            let allFavorites = [];
            let favoriteOffset = 0;
            const favoriteLimit = 20;
            let favoriteTotal = 0;

            try {
                // Use PUBLIC favorites endpoint discovered via browser inspection
                // Requires: limit, offset, created_at, slug, type=all
                const now = Math.floor(Date.now() / 1000);
                const favUrl = (offset) => `https://sspai.com/api/v1/article/user/favorite/public/page/get?limit=${favoriteLimit}&offset=${offset}&created_at=${now}&slug=${slug}&type=all`;

                console.log(`  Fetching favorites from: ${favUrl(0)}`);
                const firstFavRes = await fetchUrl(favUrl(0));

                if (firstFavRes.error !== 0) {
                    console.error('Favorites API returned error:', firstFavRes.error, firstFavRes.msg);
                } else {
                    favoriteTotal = firstFavRes.total || 0;
                    allFavorites = firstFavRes.data || [];
                    console.log(`  Found ${favoriteTotal} favorites.`);
                }

                while (allFavorites.length < favoriteTotal) {
                    favoriteOffset += favoriteLimit;
                    const res = await fetchUrl(favUrl(favoriteOffset));
                    if (!res.data || res.data.length === 0) break;
                    allFavorites = allFavorites.concat(res.data);
                    await new Promise(r => setTimeout(r, 300));
                    if (allFavorites.length >= 200) break; // Limit to 200 for analysis
                }
            } catch (e) {
                console.error("Favorites fetch error:", e);
            }

            const favorites = {
                total: favoriteTotal,
                list: allFavorites.map(f => ({
                    id: f.id,
                    title: f.title,
                    slug: f.slug || f.id, // Fallback
                    author: f.author,
                    created_at: f.created_at || f.created_time || 0,
                    banner: f.banner,
                    summary: f.summary,
                    tags: f.tags || []
                }))
            };

            const engagement = {
                following,
                followers,
                favorites, // Add this
                likes_given_total: allActivities.filter(a => a.key === 'like_article').length,
                comments_made_total: allActivities.filter(a => ['comment_article', 'community_comment_topic', 'community_reply_topic_comment', 'community_comment_topic_comment'].includes(a.key)).length,
                all_activities: allActivities.map(a => {
                    let commentContent = a.data?.comment || null;
                    if (commentContent && typeof commentContent === 'object') {
                        commentContent = commentContent.body || commentContent.content || null;
                    }

                    const rawData = Array.isArray(a.data) ? a.data[0] : a.data;

                    return {
                        key: a.key,
                        action: a.action,
                        created_at: a.created_at,
                        target_title: rawData?.title || rawData?.article_title || rawData?.topic?.title || rawData?.topic?.content || rawData?.content || rawData?.nickname || rawData?.user?.nickname || null,
                        target_id: rawData?.id || rawData?.article_id || rawData?.topic?.id || null,
                        target_slug: rawData?.slug || rawData?.article_slug || rawData?.user?.slug || null,
                        comment_content: commentContent,
                        type: a.key.includes('topic') ? 'topic' : 'article',
                        author: rawData?.author?.nickname || rawData?.article_author_nickname || rawData?.nickname || rawData?.user?.nickname || null,
                        author_slug: rawData?.author?.slug || rawData?.article_author_slug || rawData?.slug || rawData?.user?.slug || null,
                        author_avatar: rawData?.author?.avatar || rawData?.article_author_avatar || rawData?.avatar || rawData?.user?.avatar || null,
                        tags: rawData?.tags || []
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

            // Add Favorites to Analysis
            engagement.favorites.list.forEach(fav => {
                if (fav.id) uniqueArticleIds.add(fav.id);
                if (fav.author && fav.author.slug) uniqueAuthorSlugs.add(fav.author.slug);
            });

            // Metadata cache loading
            let articleMetadata = {};
            let authorMetadata = {};

            // Load cache if exists
            try {
                if (fs.existsSync(METADATA_CACHE_FILE)) {
                    const cacheData = JSON.parse(fs.readFileSync(METADATA_CACHE_FILE, 'utf8'));
                    articleMetadata = cacheData.articles || {};
                    authorMetadata = cacheData.authors || {};
                    console.log(`  Loaded metadata cache: ${Object.keys(articleMetadata).length} articles, ${Object.keys(authorMetadata).length} authors.`);
                }
            } catch (e) {
                console.warn('  Failed to load metadata cache:', e.message);
            }


            console.log(`  Fetching metadata for ${Math.min(uniqueArticleIds.size, 500)} articles and unique authors...`);

            // 1. Fetch Article Metadata (for tags and dates)
            let artMetaCount = 0;
            // Count missing metadata to avoid hitting limit immediately if everything is cached
            const missingIds = [...uniqueArticleIds].filter(id => !articleMetadata[id]);
            console.log(`  Need to fetch metadata for ${missingIds.length} new/uncached articles.`);

            for (const id of missingIds) {
                if (artMetaCount >= 500) break;
                try {
                    const res = await fetchUrl(`https://sspai.com/api/v1/article/info/get?id=${id}`);
                    if (res.data) {
                        articleMetadata[id] = {
                            tags: res.data.tags || [],
                            author: res.data.author,
                            author_seconds: res.data.author_seconds || [], // Capture co-authors
                            created_at: res.data.released_time || res.data.created_time || 0 // Capture released_time (publication) over created_time (draft)
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
                            avatar: author_avatar || 'https://cdn.sspai.com/static/avatar/default.png',
                            slug: author_slug
                        };
                    }
                    authorMatrix[author].count += 1; // Interacted heavily
                }
            });

            // Process Favorites for Analysis
            engagement.favorites.list.forEach(fav => {
                const metaArt = articleMetadata[fav.id];
                const metaAuth = authorMetadata[fav.author?.slug] || metaArt?.author || null;

                // Backfill date if missing
                if ((!fav.created_at || fav.created_at === 0) && metaArt?.created_at) {
                    fav.created_at = metaArt.created_at;
                }

                // Backfill/Fix author info
                if ((!fav.author || !fav.author.slug || !fav.author.avatar) && metaArt?.author) {
                    fav.author = {
                        nickname: metaArt.author.nickname,
                        slug: metaArt.author.slug,
                        avatar: normalizeAvatarUrl(metaArt.author.avatar)
                    };
                } else if (fav.author) {
                    // Normalize existing avatar just in case
                    fav.author.avatar = normalizeAvatarUrl(fav.author.avatar);
                }

                const tags = (metaArt?.tags || []);
                const author = fav.author?.nickname || metaAuth?.nickname || null;
                const author_slug = fav.author?.slug || metaAuth?.slug || null;
                const author_avatar = fav.author?.avatar || metaAuth?.avatar || null;

                // Tags
                const cleanTags = [];
                if (tags && Array.isArray(tags)) {
                    tags.forEach(tag => {
                        const tagName = typeof tag === 'object' ? tag.title : tag;
                        socialTags[tagName] = (socialTags[tagName] || 0) + 1; // Favorites count as interest
                        cleanTags.push(tagName);
                    });
                }
                fav.tags = cleanTags; // Attach for frontend analysis

                // Authors (Filter out self)
                const authorsToCount = [];
                if (author) authorsToCount.push({ name: author, slug: author_slug, avatar: author_avatar });

                // Add co-authors from metadata
                if (metaArt?.author_seconds && Array.isArray(metaArt.author_seconds)) {
                    metaArt.author_seconds.forEach(sec => {
                        if (sec.nickname && sec.slug) {
                            const secAvatar = normalizeAvatarUrl(sec.avatar);
                            authorsToCount.push({ name: sec.nickname, slug: sec.slug, avatar: secAvatar });
                        }
                    });
                }

                authorsToCount.forEach(a => {
                    if (a.name !== baseInfo.nickname && a.slug !== slug) {
                        if (!authorMatrix[a.name]) {
                            authorMatrix[a.name] = {
                                count: 0,
                                avatar: a.avatar || 'https://cdn.sspai.com/static/avatar/default.png',
                                slug: a.slug
                            };
                        }
                        authorMatrix[a.name].count += 1; // Favorite implies strong endorsement
                    }
                });
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


            return {
                user: { ...baseInfo, engagement },
                metadata: { articles: articleMetadata, authors: authorMetadata }
            };
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

        const statsEntry = {
            timestamp: Math.floor(Date.now() / 1000),
            user: userInfo.user, // User info + engagement inside
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
        if (global.COOKIE_STATUS === 'expired') {
            console.warn('⚠️  WARNING: Cookie was invalid. Stats are partial (Views=0).');
        }

        // --- Intelligent Frequency Logic ---
        const lastArticle = detailedArticles.length > 0
            ? Math.max(...detailedArticles.map(a => a.created_time)) * 1000 // SSPAI uses seconds
            : 0;

        const hoursSinceLastPost = (new Date() - new Date(lastArticle)) / (1000 * 60 * 60);
        const isRushHour = hoursSinceLastPost < 48; // Within 48 hours of a new post
        // Relaxed schedule: Sync every 2 hours even if not rush hour
        const isDailySync = new Date().getUTCHours() % 2 === 0;
        const isForceSave = process.env.FORCE_SAVE === 'true';

        console.log(`Last post: ${new Date(lastArticle).toLocaleString()}`);
        console.log(`Hours since last post: ${hoursSinceLastPost.toFixed(1)}h`);

        if (isRushHour || isDailySync || isForceSave) {
            console.log(isRushHour ? '>> RUSH HOUR DETECTED: Intensive tracking active.' : '>> Daily maintenance sync.');

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

            // 3. Write detailed snapshot (FULL DATA now, not just articles)
            fs.writeFileSync(CURRENT_STATS_FILE, JSON.stringify(statsEntry, null, 2));


            // Save Metadata Cache
            try {
                const articleMetadata = userInfo.metadata?.articles || {};
                const authorMetadata = userInfo.metadata?.authors || {};
                const cacheData = {
                    articles: articleMetadata,
                    authors: authorMetadata,
                    last_updated: Date.now()
                };
                fs.writeFileSync(METADATA_CACHE_FILE, JSON.stringify(cacheData, null, 2));
                console.log(`  Saved metadata cache to ${METADATA_CACHE_FILE}`);
            } catch (e) { console.error('Failed to save metadata cache:', e); }

            console.log('Stats updated successfully.');
            console.log(`Updated ${CURRENT_STATS_FILE} with full stats entry.`);
        } else {
            console.log('>> NORMAL PERIOD: Skipping persistent save to reduce noise. (Set FORCE_SAVE=true to override)');
        }

    } catch (err) {
        console.error('Main execution failed:', err);
        process.exit(1);
    }
}

main();
