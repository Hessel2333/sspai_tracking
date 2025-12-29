const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


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

async function main() {
    try {
        const articles = await fetchAllArticles();
        console.log(`\nTotal articles found: ${articles.length}`);

        const now = new Date().toISOString();

        // 1. Calculate Aggregates
        const totalViews = articles.reduce((sum, art) => sum + (art.view_count || 0), 0);
        const totalLikes = articles.reduce((sum, art) => sum + (art.like_count || 0), 0);
        const totalComments = articles.reduce((sum, art) => sum + (art.comment_count || 0), 0);
        const articleCount = articles.length;

        const statsEntry = {
            timestamp: now,
            totals: {
                article_count: articleCount,
                views: totalViews,
                likes: totalLikes,
                comments: totalComments
            },
            articles: articles.map(art => ({
                id: art.id,
                title: art.title,
                views: art.view_count,
                likes: art.like_count,
                comments: art.comment_count,
                created_at: art.created_time // Useful for sorting by age later
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

        // 3. Write detailed snapshot (optional, good for debugging or detailed frontend view)
        // We can save the full list if we want to track individual article performance later
        fs.writeFileSync(CURRENT_STATS_FILE, JSON.stringify(articles, null, 2));
        console.log(`Updated ${CURRENT_STATS_FILE}`);

    } catch (err) {
        console.error('Main execution failed:', err);
        process.exit(1);
    }
}

main();
