# CodeRev - AI-Powered Code Review Assistant

An intelligent code review tool that leverages Claude AI to provide detailed, categorized feedback on code quality, security, style, and best practices.

## Features (Roadmap)

- **Phase 1**: Code paste input + AI review via Claude API
- **Phase 2**: React UI with categorized review results (bugs, security, style, improvements)
- **Phase 3**: GitHub PR URL input + file-by-file review
- **Phase 4**: Rate limiting, caching, Docker containerization

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI**: Anthropic Claude API (claude-haiku-4-5-20251001)
- **GitHub Integration**: GitHub REST API
- **Container**: Docker (Phase 4)

## Project Structure

```
CodeRev/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── App.tsx
│   └── package.json
├── server/              # Express backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── parsers/     # Response parsing
│   │   ├── middleware/  # Express middleware
│   │   ├── types/       # TypeScript definitions
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Setup Instructions (WIP)

### Prerequisites

- Node.js 18+
- Anthropic API key
- GitHub token (optional, for Phase 3)

### Backend Setup

```bash
cd server
npm install
cp ../.env.example ../.env
# Edit .env with your API keys
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

## API Endpoints (WIP)

### POST /api/review
Analyze code and return categorized review feedback.

**Request:**
```json
{
  "code": "function example() { ... }",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "uuid",
  "issues": [
    {
      "id": "issue-1",
      "severity": "error",
      "category": "bug",
      "title": "Issue title",
      "description": "Detailed description"
    }
  ]
}
```

## Development Notes

- All code uses TypeScript strict mode
- ES modules (import/export) throughout
- Sensitive data in .env, never hardcoded
- Phase 1 focuses on backend skeleton + API integration

## License

MIT
