import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CRON_DENSE, CRON_SPARSE, evaluateSamplingPolicy } from './samplingPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data/current_stats.json');
const WORKFLOW_PATH = path.join(__dirname, '../.github/workflows/scrape.yml');

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

    // Update Workflow File
    let workflowContent = fs.readFileSync(WORKFLOW_PATH, 'utf8');

    // Regex to find the cron line. 
    // Matches: - cron: '...'
    const cronRegex = /(- cron: )(['"])(.*?)(['"])/;
    const match = workflowContent.match(cronRegex);

    if (match) {
        const currentCron = match[3];
        const policy = evaluateSamplingPolicy({
            currentSnapshot: data,
            history: fs.existsSync(path.join(__dirname, '../data/history.json'))
                ? JSON.parse(fs.readFileSync(path.join(__dirname, '../data/history.json'), 'utf8'))
                : [],
            currentCron
        });
        const targetCron = policy.cron;

        console.log(`Sampling mode: ${policy.mode}`);
        console.log(`Reasons: ${policy.reasons.join(', ')}`);
        if (policy.latestArticle) {
            console.log(`Latest article: ${policy.latestArticle.title} (${policy.latestArticle.ageHours}h ago)`);
        }
        if (policy.recentGrowth) {
            console.log(
                `Recent growth: ${policy.recentGrowth.articleTitle} +${policy.recentGrowth.deltaViews} views ` +
                `in ${policy.recentGrowth.hours}h (${policy.recentGrowth.ratePer24h}/24h)`
            );
        }
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
