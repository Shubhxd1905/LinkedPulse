# LinkedPulse - AI LinkedIn Profile & Post Optimizer

An end-to-end, high-performance web application engineered to optimize LinkedIn profiles, craft high-converting posts, schedule content, and monitor audience growth trends.

---

## 🚀 Key Features

1. **Automated Profile Analysis & Actionable Suggestions**:
   - Comprehensive heuristic audit of Headline, About/Summary, Experience, and Endorsed Skills.
   - Dynamic Profile Strength Score (0-100) and Social Selling Index (SSI) calculation.
   - Actionable recommendations with prioritized severity badges (Critical, Warning, Informational).
   - One-click AI Rewriter supporting 4 tones (*Recruiter Magnet*, *Thought Leader*, *Tech Authority*, *Builder/Founder*).

2. **Content Ideation & Post Scheduling Tools**:
   - Viral ideation generator offering high-performing angles (contrarian takes, case studies, curated frameworks).
   - Real-time LinkedIn feed card mockup with authentic desktop/mobile typography and "...see more" cutoff preview.
   - Post formatting helpers (Unicode bold/italics, bullet lists, hashtag injector).
   - Optimal posting time advisor (Tuesday & Thursday mornings) with interactive calendar scheduling queue.

3. **Performance Analytics & Growth Trends**:
   - Interactive Chart.js engagement visualization tracking 7-day impressions and interactions.
   - Key KPI metric cards (Profile Views growth, Post Impressions, Average Engagement Rate, SSI Rank).
   - Top-performing posts leaderboard with metrics breakdown.

4. **Personalized Recommendations by Goal & Industry**:
   - Dynamic 4-week growth roadmap tailored to user goals (*Attract Recruiters*, *Build Authority*, *Generate B2B Leads*, *Grow Audience*).
   - Industry-specific high-intent keyword cloud for recruiter search ranking.
   - Best posting windows backed by LinkedIn algorithm research.

5. **LinkedIn API Integration & Seamless Data Import/Export**:
   - Integrated OAuth 2.0 configuration modal and one-click data sync.
   - Export full JSON/audit report with one click.
   - LocalStorage persistence ensuring data remains preserved across reloads.

---

## 🛠️ Quickstart

### Option 1: Run with Python Server (Recommended)
From the `linkedin-optimizer` folder, run:
```bash
python server.py
```
Then open your browser to:
```
http://localhost:8000
```

### Option 2: Standalone Browser Launch
Open `index.html` directly in any web browser (Chrome, Edge, Firefox, Safari). All features, charts, and audits run natively without any installation.

---

## 📁 File Structure
```
linkedin-optimizer/
├── index.html        # Modern responsive UI with Tailwind CSS & Lucide icons
├── styles.css        # Authentic LinkedIn feed components, gauges & glassmorphism
├── app.js            # Reactive application logic, audit scoring, Chart.js & scheduler
├── server.py         # Python REST API server for backend analysis & persistence
└── README.md         # Documentation and guide
```
