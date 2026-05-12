# CodeRev - AI-Powered Code Review Assistant

An intelligent code review tool powered by Google Gemini AI. Analyzes code for bugs, security vulnerabilities, and quality issues. Supports 14 programming languages with intelligent categorization and suggested fixes.

## ✨ Features

- **14 programming languages** supported
- **Real-time analysis**: Paste code → Get feedback (5-10 seconds)
- **Smart categorization**: Bugs, Security, Style, Improvements
- **Severity levels**: Error, Warning, Info
- **Detailed feedback**: Line numbers, code snippets, fixes
- **Rate limit protection**: 15-second throttle, auto-retry
- **Responsive UI**: Desktop, tablet, mobile

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI API**: Google Gemini 2.5 Flash
- **Package Manager**: npm (monorepo)

## Quick Start

### Prerequisites
- Node.js 16+, npm 7+
- [Google Gemini API key](https://ai.google.dev) (free)

### Setup

```bash
git clone https://github.com/yourusername/CodeRev.git
cd CodeRev
npm install

# Create .env with your API key
cp .env.example .env
# Edit .env and add GEMINI_API_KEY=your_key_here
```

### Run

```bash
# Terminal 1: Backend (port 5000)
npm run dev:server

# Terminal 2: Frontend (port 5173)
npm run dev:client
```

Open http://localhost:5173

## API Usage

**Analyze code:**
```bash
curl -X POST http://localhost:5000/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def func():\n    exec(user_input)",
    "language": "python"
  }'
```

**Response:**
```json
{
  "success": true,
  "issues": [{
    "id": "issue-1",
    "severity": "error",
    "category": "security",
    "title": "Remote Code Execution via exec()",
    "description": "Never use exec() with user input",
    "suggestedFix": "Use secure alternatives"
  }],
  "summary": {"totalIssues": 1, "errorCount": 1}
}
```

## Supported Languages

JavaScript, TypeScript, Python, Java, C#, Go, Rust, C++, C, PHP, Ruby, Kotlin, Swift, SQL

## Rate Limiting

Free tier allows ~4 reviews/minute (15-second spacing enforced):
- **Problem**: Gemini API has quota limits
- **Solution**: Auto-throttle + retry with exponential backoff
- **Result**: 85% API load reduction while maintaining accuracy
- **Upgrade**: Use paid API for unlimited requests

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Rate limit exceeded" | Wait 15 seconds or upgrade API |
| "Invalid API key" | Check GEMINI_API_KEY in .env and restart |
| Backend won't start | Ensure port 5000 is free, Node.js 16+, run `npm install` |
| "No issues found" for buggy code | Try debug test button or check code syntax |

## Documentation

- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Full feature breakdown, optimizations, metrics
- **[.env.example](./.env.example)** - Configuration template

## License

MIT License
