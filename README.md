# ConversionAI - AI-Based Website Content Conversion Optimizer

A production-ready SaaS application that analyzes website content and provides AI-powered conversion optimization recommendations.

## 🎯 Overview

ConversionAI helps businesses improve their website conversion rates by:
1. Automatically extracting key above-the-fold content from any public website
2. Scoring content effectiveness using AI (0-100 scale)
3. Explaining why content is weak or strong with business-friendly language
4. Generating high-conversion rewrite suggestions
5. Displaying results in a clean, professional SaaS dashboard

## 🏗️ System Architecture

```
┌─────────────────┐
│   Next.js UI    │ ← User submits URL
│  (React/Tailwind)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │ ← Async job creation
│  /api/analyze   │
└────────┬────────┘
         │
         ├──→ Web Scraper (Cheerio) ─────→ Extract HTML
         │
         ├──→ Content Extractor ─────────→ Parse H1, H2, CTAs, Body
         │
         ├──→ AI Analyzer (Gemini) ──────→ Score & Generate Rewrites
         │
         └──→ MongoDB ───────────────────→ Store Analysis Results
```

## 🗄️ Database Schema

### `analyses` Collection

```javascript
{
  _id: UUID,                    // Unique analysis ID
  url: string,                  // Website URL analyzed
  status: enum,                 // 'analyzing' | 'completed' | 'failed'
  createdAt: timestamp,         // When analysis started
  completedAt: timestamp,       // When analysis finished
  
  extractedContent: {
    headline: string,           // H1 or primary heading
    subheadline: string,        // H2 or first paragraph
    cta: string[],             // Call-to-action buttons/links
    bodyCopy: string           // Hero section text (first ~800 chars)
  },
  
  scores: {
    overall: number,           // 0-100 overall conversion score
    headline: {
      score: number,           // 0-100
      clarity: number,         // 0-10
      specificity: number,     // 0-10
      actionability: number    // 0-10
    },
    subheadline: {
      score: number,
      clarity: number,
      specificity: number
    },
    cta: {
      score: number,
      actionability: number,
      persuasiveness: number
    },
    bodyCopy: {
      score: number,
      readability: number,
      persuasiveness: number
    }
  },
  
  explanations: {
    overall: string,           // Overall conversion assessment
    headline: string,          // Why headline scored as it did
    subheadline: string,       // Subheadline analysis
    cta: string,              // CTA effectiveness explanation
    bodyCopy: string          // Body copy analysis
  },
  
  rewrites: {
    headline: string[],        // 2-3 improved versions
    subheadline: string[],     // 2 improved versions
    cta: string[],            // 2-3 improved versions
    bodyCopy: string[]        // 2 improved versions
  },
  
  error: string                // Error message if failed
}
```

## 📡 API Endpoints

### POST `/api/analyze`
Submit a URL for analysis.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "analysisId": "uuid",
  "status": "analyzing",
  "message": "Analysis started. Check status endpoint for progress."
}
```

### GET `/api/analyze?page=1&limit=10`
List all analyses (paginated).

**Response:**
```json
{
  "analyses": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

### GET `/api/analyses/:id`
Get specific analysis details.

**Response:**
```json
{
  "_id": "uuid",
  "url": "https://example.com",
  "status": "completed",
  "extractedContent": {...},
  "scores": {...},
  "explanations": {...},
  "rewrites": {...}
}
```

### DELETE `/api/analyses/:id`
Delete an analysis.

**Response:**
```json
{
  "message": "Analysis deleted successfully"
}
```

## 🧠 AI Scoring Logic

### Scoring Criteria

**Clarity (0-10)**
- Is the message immediately understandable?
- Jargon-free language?
- Simple sentence structure?

**Specificity (0-10)**
- Concrete details vs. vague statements?
- Numbers, data, or specific benefits?
- Tangible value propositions?

**Actionability (0-10)**
- Clear next step indicated?
- Urgency created?
- Friction removed?

**Readability (0-10)**
- Short sentences?
- Simple vocabulary?
- Scannable formatting?

**Persuasiveness (0-10)**
- Benefits highlighted?
- Pain points addressed?
- Social proof or credibility markers?

### Overall Score Calculation
```
Overall = (
  headline.score * 0.30 +
  subheadline.score * 0.25 +
  cta.score * 0.25 +
  bodyCopy.score * 0.20
)
```

### Rewrite Guidelines
1. Focus on benefits, not features
2. Use action verbs (Get, Start, Unlock, Discover)
3. Include numbers when possible (3x faster, 50% savings)
4. Address user pain points
5. Create urgency or curiosity
6. Keep it concise (headlines < 10 words)

## 🎨 Frontend Features

### Dashboard View
- Clean SaaS-style interface with gradient purple/pink theme
- URL input with instant validation
- Real-time analysis progress indicator
- Paginated list of recent analyses
- Status badges (analyzing/completed/failed)

### Analysis Detail View
- Overall conversion score with color coding:
  - 🟢 80-100: Excellent
  - 🟡 60-79: Good
  - 🔴 0-59: Needs Improvement
- Detailed breakdown with progress bars
- Section-wise scoring metrics
- Business-friendly explanations
- Tabbed interface for content sections
- One-click copy for rewrite suggestions

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- shadcn/ui components
- Lucide icons

**Backend:**
- Next.js API Routes
- MongoDB (database)
- Cheerio (web scraping)
- Google Gemini 2.5 Flash (AI analysis)

**Deployment:**
- Docker containerized
- Environment variable configuration
- Hot reload enabled for development

## ⚙️ Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=conversion_optimizer
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Google Gemini API key

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Configure environment variables in `.env`

3. Start the development server:
```bash
yarn dev
```

4. Open http://localhost:3000

## 📈 Usage Flow

1. **Submit URL**: Enter any public website URL
2. **Wait for Analysis**: ~10-20 seconds (async processing)
3. **View Results**: 
   - Overall score and breakdown
   - Detailed explanations
   - AI-generated rewrites
4. **Copy Suggestions**: Use one-click copy for any rewrite
5. **Compare**: Analyze multiple URLs to A/B test

## 🧪 Content Extraction Strategy

### HTML Parsing
- Uses Cheerio for fast, efficient parsing
- Removes script/style/iframe tags
- Handles both static and rendered content

### Element Detection
- **Headline**: First `<h1>` or `<title>` fallback
- **Subheadline**: First `<h2>` or significant paragraph
- **CTAs**: Buttons, links with button classes, action-word links
- **Body**: First 800 characters of meaningful paragraph text

### Edge Cases Handled
- Missing elements (graceful fallbacks)
- JavaScript-heavy sites (basic content still extracted)
- Non-English content (AI handles multiple languages)
- Duplicate/placeholder text (detected and flagged)

## 🔒 Security Considerations

### Current Implementation
- URL validation (HTTP/HTTPS only)
- Timeout protection (10s for scraping)
- Error handling and graceful failures
- No user authentication (simplified MVP)

### Production Recommendations
1. Add rate limiting per IP
2. Implement user authentication
3. Add CAPTCHA for public endpoints
4. Sanitize all user inputs
5. Add CORS restrictions
6. Implement API key rotation
7. Add request signing

## 📊 Performance

### Optimization Strategies
- Async job processing (non-blocking)
- MongoDB connection pooling
- Efficient text extraction (Cheerio vs Puppeteer)
- Paginated API responses
- Client-side caching

### Typical Processing Times
- Web scraping: 1-3 seconds
- Content extraction: <100ms
- AI analysis: 5-15 seconds
- **Total**: 10-20 seconds per analysis

## 🎯 Future Enhancements

### MVP Completed ✅
- [x] Web scraping and content extraction
- [x] AI-powered scoring
- [x] Detailed explanations
- [x] Rewrite suggestions
- [x] Beautiful SaaS dashboard
- [x] Analysis history

### Next Phase 🚀
- [ ] User authentication (email/password)
- [ ] Subscription tiers (free/paid)
- [ ] Usage limits and billing
- [ ] Competitor comparison view
- [ ] Export reports (PDF/CSV)
- [ ] Historical tracking (score changes over time)
- [ ] Team collaboration features
- [ ] API access for integrations
- [ ] Webhook notifications
- [ ] A/B testing recommendations

## 📝 Testing

### Manual Testing
```bash
# Test analysis endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check analysis status
curl http://localhost:3000/api/analyses/{analysisId}
```

### Test URLs
- https://www.apple.com (Complex, product-focused)
- https://stripe.com (SaaS, developer-focused)
- https://example.com (Simple, minimal content)
- https://www.tesla.com (High visual, less text)

## 🐛 Troubleshooting

### Analysis Fails
- Check GEMINI_API_KEY is set correctly
- Verify API quota hasn't been exceeded
- Check website is publicly accessible
- Review MongoDB connection

### Extraction Issues
- Some websites use heavy JavaScript (basic text still extracted)
- Paywalled content won't be accessible
- Rate-limited sites may block requests

### UI Not Loading
- Verify Next.js server is running on port 3000
- Check browser console for errors
- Clear browser cache

## 📄 License

This is a production-ready MVP built for commercial use.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API error messages
3. Check server logs at `/var/log/supervisor/nextjs.out.log`

---

**Built with ❤️ using Next.js, MongoDB, and Google Gemini AI**
