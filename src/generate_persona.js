
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_FILE = path.join(__dirname, '../data/history.json');
const OUTPUT_FILE = path.join(__dirname, '../data/persona.json');
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('Error: GEMINI_API_KEY is missing in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function main() {
    console.log('Reading history data...');
    let history = [];
    try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to read history file:', e);
        process.exit(1);
    }

    if (history.length === 0) {
        console.error('No history data found.');
        process.exit(1);
    }

    const latest = history[history.length - 1];
    const user = latest.user || {};
    const articles = latest.articles || [];
    const activities = user.engagement?.all_activities || [];

    // --- Prepare Context ---
    // 1. Articles (Title + Summary Tags)
    const articleContext = articles.map(a => `- 文章《${a.title}》 (标签: ${a.tags.join(', ')})`).join('\n');

    // 2. Recent Comments (Content)
    const recentComments = activities
        .filter(a => a.comment_content)
        .slice(0, 30) // Last 30 comments
        .map(a => `- 评论了《${a.target_title}》: "${a.comment_content}"`)
        .join('\n');

    // 3. Followed Columns/Authors (Interests)
    const interests = activities
        .filter(a => a.key.includes('follow'))
        .slice(0, 20)
        .map(a => a.target_title || a.action)
        .join(', ');

    const prompt = `
你是一位极其敏锐的数字人类学家和心理侧写师。请根据以下少部分的用户数据（少数派社区），为这位用户生成一份“数字人格画像”。

### 用户数据
**已发布文章**:
${articleContext}

**近期评论/互动**:
${recentComments}

**关注兴趣**:
${interests}

### 任务要求
请返回一个 **纯 JSON 格式** 的结果（不要包含 Markdown 代码块标记），包含以下三个字段：

1.  **keywords**: 5个最能概括该用户数字气质的四字成语或短词（例如：数码极客、生活观察家、犀利评论、温和理性等）。
2.  **impression**: 一段 100 字左右的侧写。描述这个人的创作风格、关注领域以及在社区中的性格特征（是乐于助人、还是喜欢深度甚至硬核的技术探讨？是感性生活派还是理性效率派？）。请用第二人称“你”来描述，语气要温暖、有洞察力，像一位老朋友的评价。
3.  **suggestions**: 3条简短的创作或互动建议（每条不超过 20 字），帮助他更好地在该社区发展或探索新领域。

### JSON 格式示例
{
  "keywords": ["硬核折腾", "效率至上", "生活黑客", "深度思考", "热心解答"],
  "impression": "你是一位典型的实干家...",
  "suggestions": ["尝试写一篇长文...", "多多关注..."]
}
`;

    console.log('Generating Digital Persona with Gemini...');
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const personaData = JSON.parse(text);

        // Add generation metadata
        personaData.generated_at = new Date().toISOString();
        personaData.nickname = user.nickname || '用户';

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(personaData, null, 2));
        console.log(`Success! Persona saved to ${OUTPUT_FILE}`);
        console.log('Preview:', personaData.keywords);

    } catch (e) {
        console.error('Error calling Gemini API:', e);
        process.exit(1);
    }
}

main();
