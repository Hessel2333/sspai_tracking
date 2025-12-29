# SSPAI Article Tracker (少数派文章数据追踪)

本项目是一个自动化的数据追踪工具，用于记录、存储并可视化你在 [少数派 (SSPAI)](https://sspai.com) 发布的文章数据（阅读量、点赞数、评论数）。

它结合了 **Node.js 爬虫**（运行在 GitHub Actions 上）与 **Next.js 数据看板**，为你提供美观、直观的历史数据增长分析。

## ✨ 功能亮点

- **全自动数据采集**：通过 GitHub Actions 每小时自动运行一次，获取最新数据。
- **隐私与权限**：使用你自己的 Cookie 进行身份验证，因此可以准确获取包含“私有/草稿”文章在内的真实阅读量。
- **历史趋势回溯**：将每次采集的数据存储为 JSON 历史档案，让你能看到数据随时间变化的完整曲线。
- **交互式数据看板**：
    - **总览卡片**：展示总阅读量、总点赞、总评论数。
    - **趋势图表**：直观的折线图展示整体流量增长趋势。
    - **文章列表**：支持按标题、发布时间、阅读量等字段进行**排序**。
    - **单篇详情分析**：点击任意文章，即可查看该篇文章专属的各项数据增长详情页。
- **精致 UI 设计**：遵循 Apple Human Interface Guidelines 设计规范，风格极简、优雅，在大屏幕与移动端均有良好表现。

## 🚀 快速开始

### 准备工作

- 本地已安装 Node.js环境。
- 一个 GitHub 账号（用于托管代码和运行自动爬虫）。
- 一个 Vercel 账号（可选，用于部署前端网页）。

### 本地安装与运行

1.  **克隆仓库**：
    ```bash
    git clone https://github.com/Hessel2333/sspai_tracking.git
    cd sspai_tracking
    ```

2.  **安装依赖**：
    ```bash
    npm install
    ```

3.  **配置环境变量**：
    在项目根目录创建一个 `.env` 文件，填入以下内容：
    ```bash
    # 从 sspai.com 的请求 Cookie 中获取（在浏览器 F12 中找到包含 'sspai_jwt_token' 的完整 Cookie 字符串）
    SSPAI_COOKIE="your_full_cookie_string_here"
    
    # 你的少数派个人主页 User Slug (例如 sspai.com/u/yourname 中的 yourname)
    SSPAI_SLUG="your_slug_here"
    ```

4.  **测试爬虫脚本**：
    ```bash
    npm run scrape
    ```
    运行成功后，`data/history.json` 文件中应会出现新的数据记录。

5.  **启动前端看板**：
    ```bash
    npm run dev
    ```
    浏览器打开 [http://localhost:3000](http://localhost:3000) 即可查看你的数据大屏。

## ⚙️ 工作原理

1.  **抓取**：`src/fetch_stats.js` 脚本会利用你的 Token 调用少数派私有 API 获取文章列表数据。
2.  **调度**：`.github/workflows/scrape.yml` 配置了 Cron 任务，指示 GitHub Actions 每小时（`30 * * * *`）执行一次抓取脚本。
3.  **存储**：抓取完成后，脚本会自动将更新后的 `data/history.json` 提交（Commit）回 GitHub 仓库。
4.  **展示**：Next.js 前端应用读取该 JSON 文件，渲染出漂亮的图表和列表。

## 📦 部署指南

### 1. 启用 GitHub Actions (自动爬虫)
- 将本项目代码 Push 到你的 GitHub 仓库。
- 进入仓库的 **Settings > Secrets and variables > Actions**。
- 添加 Repository Secrets (仓库密钥)：
    - `SSPAI_COOKIE`: 填入你的完整 Cookie 字符串。
    - `SSPAI_SLUG`: 填入你的用户 Slug。
- 配置完成后，爬虫即会每小时自动运行。

### 2. 部署前端看板 (Vercel)
- 登录 [Vercel](https://vercel.com) 并点击 "Add New Project"。
- 导入你的 GitHub 仓库。
- Vercel 会自动识别 Next.js 框架，直接点击 **Deploy** 即可。
- **注意**：由于数据来源于 Git 仓库中的 JSON 文件，每当 GitHub Actions 更新数据并 Commit 时，Vercel 也会自动检测到代码变更并重新构建部署，从而保证页面数据是最新的。

## 🛠 技术栈

- **前端**：Next.js, React, Chart.js (react-chartjs-2), Day.js
- **脚本/后端**：Node.js, Axios
- **CI/CD**：GitHub Actions
- **样式**：Vanilla CSS (Apple Design 风格)

## 📝 开源协议

MIT
