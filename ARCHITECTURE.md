# Thai South Translator - Architecture & Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Data Flow](#data-flow)
5. [Deployment](#deployment)
6. [Environment Variables](#environment-variables)
7. [Development](#development)
8. [Performance & Security](#performance--security)

---

## Overview

**Thai South Translator** เป็นเครื่องมือแปลภาษาไทยถิ่น (เหนือ, อีสาน, ใต้) ไปยังภาษาไทยกลาง และในทางกลับกัน โดยใช้ Google Generative AI (Gemini) เป็นตัวแปลหลัก

- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Backend**: Node.js 24.x + TypeScript
- **AI Provider**: Google Gemini 3.6 Flash
- **Deployment**: Vercel หรือ Railway

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | Latest | Markup structure |
| CSS3 | Latest | Styling & responsive design |
| Vanilla JavaScript | ES2020+ | Interactive UI (no framework) |
| Web Speech API | Built-in | Text-to-speech functionality |
| Clipboard API | Built-in | Copy to clipboard |

**ทำไมเลือก Vanilla JS:**
- ✅ ไม่ต้องใช้ build tools
- ✅ ไฟล์ขนาดเล็ก (~50KB)
- ✅ โหลดเร็ว
- ✅ ไม่มี dependencies

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ^5.7.2 | Type safety & compile-time checks |
| Node.js | 24.x | Runtime environment |
| tsx | ^4.19.2 | TypeScript executor + watch mode |
| Node.js `http` | Built-in | HTTP server (no Express/Fastify) |
| Node.js `fs` | Built-in | File system operations |

**ทำไมเลือก Minimal Stack:**
- ✅ ขนาดเล็ก (1 file: `server.ts`)
- ✅ ไม่ต้องเซ็ตอัป
- ✅ Deploy ได้เร็ว
- ✅ Vercel + Railway compatible

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | ^5.7.2 | Static type checking |
| @types/node | ^22.10.2 | Type definitions for Node.js |
| Node.js built-in test | Latest | Unit testing (no Jest/Vitest) |

### External APIs
| Service | Provider | Purpose |
|---------|----------|---------|
| Text Translation | Google Generative AI (Gemini) | AI-powered dialect translation |
| Chat Completions | OpenAI-compatible API | JSON response format support |

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   USER BROWSER                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Frontend (Vanilla JS)                           │   │
│  │ - Input: Text in Thai dialect/standard          │   │
│  │ - Select: Target dialect or central Thai        │   │
│  │ - Features: Copy, Text-to-Speech, Swap mode     │   │
│  └──────────────────┬────────────────────────────┘   │
└─────────────────────┼────────────────────────────────┘
                      │ POST /api/translate
                      │ JSON: { text, southernToCentral }
                      ↓
        ┌─────────────────────────────────┐
        │   NODE.JS BACKEND (server.ts)   │
        │  ┌──────────────────────────┐  │
        │  │ HTTP Server              │  │
        │  │ - Port: 8000 (dev)       │  │
        │  │ - PORT env var (prod)    │  │
        │  ├──────────────────────────┤  │
        │  │ API Routes:              │  │
        │  │ - GET  / → index.html    │  │
        │  │ - GET  /styles.css       │  │
        │  │ - GET  /script.js        │  │
        │  │ - POST /api/translate    │  │
        │  ├──────────────────────────┤  │
        │  │ Translation Service      │  │
        │  │ - Validate input         │  │
        │  │ - Build system prompt    │  │
        │  │ - Strip reasoning blocks │  │
        │  │ - Extract translation    │  │
        │  └────────────┬─────────────┘  │
        └───────────────┼────────────────┘
                        │ Fetch with Bearer token
                        ↓
    ┌────────────────────────────────────────┐
    │  Google Generative AI (Gemini)         │
    │  Endpoint:                             │
    │  /v1beta/openai/chat/completions       │
    │                                        │
    │ - Model: gemini-3.6-flash              │
    │ - Max tokens: 2048                     │
    │ - Temperature: 0.2 (deterministic)     │
    │ - Response format: JSON (if needed)    │
    └────────────────────────────────────────┘
                        │
                        │ JSON Response
                        ↓
    ┌─────────────────────────────────┐
    │   Backend Response              │
    │   - Strip <think> blocks        │
    │   - Extract translation         │
    │   - Return JSON: { translation }│
    └────────────┬────────────────────┘
                 │
                 │ HTTP 200 + JSON
                 ↓
    ┌──────────────────────────────────┐
    │   Frontend Display               │
    │   - Show translation result      │
    │   - Enable copy button           │
    │   - Enable speak button          │
    │   - Show success toast           │
    └──────────────────────────────────┘
```

### File Structure

```
thai-south-translator/
├── index.html              # Main UI page
├── styles.css              # Styling
├── script.js               # Frontend JavaScript (no bundling)
├── server.ts               # HTTP server + static serving
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment config
├── src/
│   └── translation-service.ts  # AI API client (logic)
├── api/
│   └── translate.ts        # Vercel serverless function (alternative)
├── test/
│   └── translation-service.test.ts  # Unit tests
└── README.md               # Project documentation
```

---

## Data Flow

### Request-Response Cycle

#### 1. **User Input → Frontend Processing**
```javascript
// script.js
{
  text: "หรอยจังหู",           // Thai dialect input
  southernToCentral: true     // Direction flag
}
```

#### 2. **Frontend → Backend (POST /api/translate)**
```json
POST /api/translate
Content-Type: application/json

{
  "text": "หรอยจังหู",
  "southernToCentral": true
}
```

#### 3. **Backend Validation (server.ts)**
- ✅ Check: text is string and not empty
- ✅ Check: text length ≤ 1,000 characters
- ✅ Check: API key is configured
- ❌ Return 400 if invalid
- ❌ Return 500 if API key missing

#### 4. **Backend → Google Gemini API (translation-service.ts)**
```bash
POST https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
Authorization: Bearer ${AI_API_KEY}
Content-Type: application/json

{
  "model": "gemini-3.6-flash",
  "max_tokens": 2048,
  "temperature": 0.2,
  "response_format": { "type": "json_object" },
  "messages": [
    {
      "role": "system",
      "content": "[Detailed Thai translation prompt in Thai language]"
    },
    {
      "role": "user",
      "content": "<source_text>\nหรอยจังหู\n</source_text>"
    }
  ]
}
```

#### 5. **AI Response Processing**
```typescript
// Strip reasoning blocks (if any)
content = stripReasoning(rawContent);

// Extract JSON or plain text
translation = extractTranslation(content, dialectToCentral);

// Validate non-empty
if (!translation) throw new AppError("No translation", 502);

return translation;
```

#### 6. **Backend → Frontend (JSON Response)**
```json
{
  "translation": "อร่อยมาก"
}
```

**Error Responses:**
```json
// 400 - Bad Request
{ "error": "กรุณาระบุข้อความที่ต้องการแปล" }

// 401 - Unauthorized
{ "error": "API Key ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้งาน" }

// 502 - Bad Gateway
{ "error": "โมเดลส่งเฉพาะข้อความวิเคราะห์โดยไม่มีคำแปล" }
```

#### 7. **Frontend Display**
- ✅ Show translation in output box
- ✅ Enable copy button
- ✅ Enable speak button
- ✅ Show success toast

---

## Deployment

### Option 1: Vercel (Recommended for Serverless)

#### Why Vercel?
- ✅ Automatic git integration (auto-deploy on push)
- ✅ Zero-config for Node.js apps
- ✅ Global edge caching
- ✅ Environment variable management
- ✅ Free tier with generous limits
- ✅ Preview URLs for pull requests

#### Setup Steps

1. **Prerequisites**
   - GitHub repo with code pushed
   - Vercel account (free)
   - Google Gemini API key

2. **Deploy via Vercel Dashboard**
   ```
   https://vercel.com/new
   → Import repo
   → Select this repository
   → Add environment variables:
     - AI_API_KEY=sk-xxx
     - AI_API_URL=(optional)
     - AI_MODEL=(optional)
   → Deploy
   ```

3. **Git Push Auto-Deployment**
   ```bash
   git push origin main
   # Vercel automatically builds and deploys
   ```

4. **Deployed URL**
   ```
   https://thai-south-translator-xyz.vercel.app
   ```

#### vercel.json Configuration
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "functions": {
    "api/translate.ts": {
      "maxDuration": 30
    }
  }
}
```

**What This Does:**
- Serves static files (HTML, CSS, JS)
- SPA routing: all unknown routes → index.html
- Serverless function `/api/translate` with 30s timeout

---

### Option 2: Railway (Recommended for Traditional Hosting)

#### Why Railway?
- ✅ No code changes needed
- ✅ Full Node.js support
- ✅ Persistent server (no cold start)
- ✅ Easier for server-side rendering
- ✅ Good for learning deployment
- ✅ Free tier with 5 GB bandwidth

#### Setup Steps

1. **Prerequisites**
   - GitHub repo with code pushed
   - Railway account (free)
   - Google Gemini API key

2. **Deploy via Railway Dashboard**
   ```
   https://railway.app
   → New Project
   → Deploy from GitHub repo
   → Select this repository
   → Railway auto-detects Node.js
   ```

3. **Add Environment Variables**
   Railway Dashboard → Environment Tab:
   ```
   AI_API_KEY=sk-xxx
   AI_API_URL=(optional)
   AI_MODEL=(optional)
   NODE_ENV=production
   ```

4. **Railway Auto-Runs**
   - `npm install`
   - `npm start` (runs `tsx server.ts`)
   - Generates public URL

5. **Deploy via GitHub Push**
   ```bash
   git push origin main
   # Railway auto-redeploys if connected
   ```

#### No Code Changes Needed
Railway automatically:
- ✅ Reads `package.json`
- ✅ Detects Node.js 24.x
- ✅ Runs `npm start`
- ✅ Exposes PORT to environment
- ✅ Sets up domain

---

### Option 3: Docker (Custom Hosting)

#### Create Dockerfile
```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

#### Build & Run
```bash
docker build -t thai-translator .
docker run -p 8000:8000 \
  -e AI_API_KEY=sk-xxx \
  thai-translator
```

#### Deploy to Any Cloud
- AWS (ECS, EC2)
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku (via Docker)

---

## Environment Variables

### Required Variables

```bash
# Google Gemini API
AI_API_KEY=sk-xxxxxxxxxxxxxxxxx
```

### Optional Variables

```bash
# Custom API endpoint (if using proxy or different provider)
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions

# Custom model name
AI_MODEL=gemini-3.6-flash

# Port (default: 8000)
PORT=8000

# Environment indicator
NODE_ENV=production
```

### Reading Configuration

**Development (.env file in project root):**
```bash
server.ts loads .env automatically using loadEnvFile()
```

**Production (Environment Variables):**
```
Vercel:  Dashboard → Settings → Environment Variables
Railway: Dashboard → Environment
Docker:  -e flag or .env file
```

---

## Development

### Local Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/thai-south-translator.git
   cd thai-south-translator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create .env File**
   ```bash
   cat > .env << EOF
   AI_API_KEY=your-gemini-api-key-here
   PORT=8000
   EOF
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   # Output: แหลงถิ่น พร้อมใช้งานที่ http://localhost:8000
   ```

5. **Open Browser**
   ```
   http://localhost:8000
   ```

### NPM Scripts

```bash
npm run dev       # Start with hot reload (tsx watch)
npm run start     # Production mode (no watch)
npm run test      # Run tests
npm run typecheck # Check TypeScript errors
```

### Type Checking

```bash
npm run typecheck
# Compiles TypeScript without generating output
```

### Running Tests

```bash
npm test
# Uses Node.js built-in test runner
```

---

## Performance & Security

### Performance Optimization

#### Frontend
- ✅ Vanilla JS (no framework overhead)
- ✅ Minimal CSS (~200 lines)
- ✅ No external fonts/libraries
- ✅ Lazy character count update
- ✅ Toast notifications timeout quickly

#### Backend
- ✅ Streaming static files
- ✅ Efficient JSON parsing
- ✅ Reasonable timeout (30s for serverless)
- ✅ Connection pooling (native fetch)

#### API Requests
- ✅ Temperature 0.2 (faster, more deterministic)
- ✅ Max tokens limited to 2048
- ✅ Request size limited to 1000 characters
- ✅ Response size limited (prevents memory issues)

### Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Frontend Size | ~50 KB | No build step |
| Static Assets | <100 KB | HTML, CSS, JS combined |
| Backend Latency | <100 ms | Node.js processing |
| AI API Latency | 1-3 s | Gemini inference time |
| Total Time | ~3-5 s | User perceivable |
| Memory Usage | ~50 MB | Minimal (node + code) |
| Concurrent Users | Unlimited | Stateless, auto-scaling |

### Security

#### API Key Protection
```typescript
// ✅ NEVER exposed to frontend
// ✅ Server-side only
// ✅ Passed via Authorization header
fetch(apiUrl, {
  headers: {
    Authorization: `Bearer ${apiKey}`
  }
})
```

#### Input Validation
```typescript
// ✅ Check type
if (typeof text !== "string") throw 400;

// ✅ Check length
if (text.length > 1000) throw 400;

// ✅ Check not empty
if (!text.trim()) throw 400;
```

#### CORS Safety
- ✅ API called from same origin (server → Google)
- ✅ No CORS headers needed
- ✅ Frontend cannot call Google API directly

#### Rate Limiting Recommendations

For production, consider adding:

```typescript
// Example: Rate limit by IP
const requestCounts = new Map<string, number>();

function isRateLimited(ip: string): boolean {
  const count = requestCounts.get(ip) ?? 0;
  if (count > 10) return true; // 10 requests per minute
  requestCounts.set(ip, count + 1);
  return false;
}
```

Or use Vercel/Railway built-in rate limiting:
- **Vercel**: Serverless function rate limits
- **Railway**: Environment resource limits

---

## Troubleshooting

### Issue: API Key Not Recognized

**Solution:**
```bash
# Verify .env file exists
cat .env

# Check Vercel/Railway environment variables
# Remove quotes from secret values (they're literal)
```

### Issue: "Port 8000 is already in use"

**Solution:**
```bash
# Use different port
PORT=8001 npm run dev

# Or kill existing process
lsof -i :8000
kill -9 <PID>
```

### Issue: TypeScript Errors

**Solution:**
```bash
# Run type checking
npm run typecheck

# Check tsconfig.json for errors
cat tsconfig.json
```

### Issue: AI Translation Not Returned

**Solution:**
- Check API key is valid
- Check internet connection
- Check Gemini API status
- Check prompt format in translation-service.ts

---

## References

- [Google Generative AI Docs](https://ai.google.dev/)
- [Vercel Deployment](https://vercel.com/docs)
- [Railway Deployment](https://docs.railway.app/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Last Updated**: August 20, 2026
**Maintained by**: Thai South Translator Team
