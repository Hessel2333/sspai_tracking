# SSPAI Article Tracker (少数派文章数据追踪)

本项目是一个自动化的数据追踪工具，用于记录、存储并可视化你在 [少数派 (SSPAI)](https://sspai.com) 发布的文章数据（阅读量、点赞数、评论数）。

它不仅是一个数据分析工具，更是一个**个人写作里程碑看板**，旨在为你提供更有温度、更具美感的创作反馈。

## ✨ 功能亮点

- **全自动数据采集**：通过 GitHub Actions 自动运行，全天候记录数据点。
- **个人品牌化设计**：集成**作者名片**（Profile）、个人简介（Bio），使页面更具个人博客色彩。
- **精选作品置顶**：自动识别阅读量最高的“镇站之宝”作为精选力作突出展示。
- **国际化支持 (i18n)**：内置中英文双语切换，默认中文。
- **动态增长感**：卡片实时对比上次采样，显示阅读量、点赞和评论的**增量偏移 (▲ Delta)**。
- **科学图表分析**：
    - **真实时间轴**：X轴按真实采样时间比例排列，准确反映增长斜率。
    - **整数刻度**：Y轴自动优化，强制显示整数分段，展示清晰。
    - **写实连线**：采用直线连接，真实表现离散型数据的阶梯式增长，无视觉失真。
- **文章作品集**：支持智能排序，点击可进入单篇文章的**深度挖掘页**。
- **精致 UI 设计**：基于 Vanilla CSS 修饰的 Apple/SSPAI 极简风格，完美支持深色/浅色视觉平衡及移动端适配。

## 🚀 快速开始

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
    创建 `.env` 文件：
    ```bash
    # SSPAI_COOKIE: 包含 'sspai_jwt_token' 的完整 Cookie
    SSPAI_COOKIE="your_cookie"
    # SSPAI_SLUG: 你的用户唯一标识 (如 sspai.com/u/xxx)
    SSPAI_SLUG="your_slug"
    ```

4.  **运行项目**：
    ```bash
    npm run dev
    ```

## 🍪 Cookie 管理指南（重要）

少数派的 Cookie **会过期**（通常有效期为 30 天左右）。过期的 Cookie 会导致**阅读量数据为 0**（只能获取公开的点赞/评论数据）。

### 2秒快速获取 Cookie (Bookmarklet)

为了方便更新，我为你写了一个“小书签”。请按照以下步骤操作：

1.  **新建书签**：在浏览器书签栏右键 -> 新建书签。
2.  **粘贴代码**：将名称设为 `Get SSPAI Cookie`，网址栏粘贴以下代码：
    ```javascript
    javascript:(function(){const c=document.cookie;const t=c.match(/sspai_jwt_token=([^;]+)/);if(t){const v=t[0];navigator.clipboard.writeText(v).then(()=>{alert('✅ Cookie 已复制！\n\n请去更新 .env 或 GitHub Secrets')}).catch(()=>{prompt('请手动复制:',v)})}else{alert('❌ 未找到登录信息，请先登录少数派！')}})();
    ```
3.  **一键复制**：当你需要更新 Cookie 时，打开 [sspai.com](https://sspai.com)，点击这个书签，Cookie 就会自动复制到你的剪贴板！

### 何时需要更新？
- 当你发现 Dashboard 顶部的 "Last Updated" 虽在更新，但阅读量（Views）不再增长时。
- 当你在本地终端运行脚本看到 `⚠️ WARNING: Cookie was invalid` 警告时。

1.  **抓取**：Node.js 脚本调用少数派 API 进行数据镜像。
2.  **调度**：GitHub Actions 每小时运行一次，保证数据颗粒度。
3.  **存储**：数据持久化于 Git 仓库中的 `data/history.json`。
4.  **分发**：Vercel 检测到 Git 变动自动触发增量构建。

## 🛠 技术栈

- **Core**: Next.js, React, Context API
- **Chart**: Chart.js (Time Scale Engine)
- **Data**: Node.js, GitHub Actions (CI), Day.js
- **Design**: Vanilla CSS (Apple Aesthetic)

## 📝 开源协议

MIT
