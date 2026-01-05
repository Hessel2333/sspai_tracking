import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/current_stats.json');
const WORKFLOW_PATH = path.join(__dirname, '../.github/workflows/scrape.yml');

// Configuration
// If latest article is within 96 hours (4 days), run hourly.
// Otherwise, run every 6 hours (to keep some freshness without spam).
const HIGH_FREQ_THRESHOLD_HOURS = 96;
const CRON_HIGH_FREQ = '30 * * * *'; // Every hour at :30
const CRON_LOW_FREQ = '30 */6 * * *'; // Every 6 hours

try {
    if (!fs.existsSync(DATA_PATH)) {
        console.log('No data found, skipping schedule update.');
        process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const articles = data.articles || [];

    if (articles.length === 0) {
        console.log('No articles found, keeping default schedule.');
        process.exit(0);
    }

    // Find latest article time
    // Data is usually sorted, but let's be safe
    const latestTime = articles.reduce((max, art) => Math.max(max, art.created_at), 0);
    const lastPostDate = dayjs.unix(latestTime);
    const hoursSinceLastPost = dayjs().diff(lastPostDate, 'hour');

    console.log(`Latest article: ${lastPostDate.format('YYYY-MM-DD HH:mm:ss')} `);
    console.log(`Time since last post: ${hoursSinceLastPost} hours`);

    let targetCron = CRON_LOW_FREQ;
    if (hoursSinceLastPost < HIGH_FREQ_THRESHOLD_HOURS) {
        targetCron = CRON_HIGH_FREQ;
        console.log('Status: ACTIVE PERIOD (High Frequency)');
    } else {
        console.log('Status: DORMANT PERIOD (Lower Frequency)');
    }

    // Update Workflow File
    let workflowContent = fs.readFileSync(WORKFLOW_PATH, 'utf8');

    // Regex to find the cron line. 
    // Matches: - cron: '...'
    const cronRegex = /(- cron: )(['"])(.*?)(['"])/;
    const match = workflowContent.match(cronRegex);

    if (match) {
        const currentCron = match[3];
        console.log(`Current Cron: ${currentCron} `);
        console.log(`Target Cron:  ${targetCron} `);

        if (currentCron !== targetCron) {
            const newContent = workflowContent.replace(cronRegex, `$1$2${targetCron} $4`);
            fs.writeFileSync(WORKFLOW_PATH, newContent, 'utf8');
            console.log('✅ Schedule updated in scrape.yml');
        } else {
            console.log('No change needed.');
        }
    } else {
        console.error('Could not find cron schedule in workflow file.');
    }

} catch (e) {
    console.error('Failed to update schedule:', e);
    process.exit(1);
}
