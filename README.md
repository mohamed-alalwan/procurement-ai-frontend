# Procurement AI Assistant (Frontend)

Chat-based analytics powered by a multi-agent AI system. Ask questions about California state procurement data (346,018 records, FY 2012–2015) in natural language and get instant visualizations and insights.

## Quick Start

```bash
npm install
cp .env.example .env  # Set VITE_API_BASE_URL if needed
npm run dev
```

The app connects to a backend API. Set `VITE_API_BASE_URL` in `.env` (defaults to `http://localhost:8000`).

## What it does

- Chat interface for querying procurement data
- Real-time clarifying questions when queries are ambiguous
- Automatic chart generation (line, bar, grouped bar)
- Interactive data tables with sorting and pagination
- Smart formatting for money, percentages, dates, and more
- AI-suggested follow-up questions based on your results

## Stack

- React + TypeScript + Vite
- Recharts for visualizations
- Tailwind CSS for styling
- Dark mode support