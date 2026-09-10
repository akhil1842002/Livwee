import type { ChatMessage, Conversation } from '@/types'

export const conversations: Conversation[] = [
  { id: '1', title: 'Revenue analysis Q2', lastMessage: 'Your Q2 revenue grew 34% YoY...', timestamp: '2 min ago', unread: false },
  { id: '2', title: 'Churn prediction model', lastMessage: 'Based on the patterns I see...', timestamp: '1 hour ago', unread: true },
  { id: '3', title: 'Customer segment report', lastMessage: 'I\'ve identified 4 key segments...', timestamp: 'Yesterday', unread: false },
  { id: '4', title: 'Pricing strategy review', lastMessage: 'Comparing your tier structure...', timestamp: '2 days ago', unread: false },
  { id: '5', title: 'Growth opportunities', lastMessage: 'Three high-impact areas stand out...', timestamp: '3 days ago', unread: false },
]

export const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your Orbit AI assistant. I can help you analyze your business metrics, generate reports, identify trends, and answer questions about your data. What would you like to explore today?',
    timestamp: '10:00 AM',
  },
  {
    id: '2',
    role: 'user',
    content: 'Give me a summary of our Q2 revenue performance.',
    timestamp: '10:01 AM',
  },
  {
    id: '3',
    role: 'assistant',
    content: `**Q2 2026 Revenue Summary**

Your Q2 performance was strong across all key metrics:

- **Total Revenue:** $284,902 — up **+12.5%** vs Q1
- **MRR:** $94,967 (new record high)
- **ARR run rate:** $1.14M (crossed the $1M milestone in May)

**Top highlights:**
1. Enterprise segment drove 43% of total revenue (+28% QoQ)
2. Subscription upgrades increased by 23.1% — your Pro tier is resonating
3. Churn dropped from 1.7% → 1.4%, saving ~$18K in ARR

**Watch out for:**
- June had 2 failed payments ($398 total) — worth a dunning campaign
- API overage revenue spiked in March; consider pricing adjustment

Want me to dig deeper into any segment?`,
    timestamp: '10:01 AM',
  },
  {
    id: '4',
    role: 'user',
    content: 'Which customer segment is growing fastest?',
    timestamp: '10:03 AM',
  },
  {
    id: '5',
    role: 'assistant',
    content: `**Fastest Growing Segment: SMB Tech Companies**

Based on your CRM and billing data, here's the breakdown:

| Segment | Growth (QoQ) | Avg Contract | Churn |
|---|---|---|---|
| SMB Tech | **+41%** | $2,400/yr | 0.9% |
| Mid-Market | +18% | $8,400/yr | 1.2% |
| Enterprise | +28% | $24,000/yr | 0.4% |
| Consumer | +6% | $588/yr | 3.1% |

**SMB Tech is your fastest growing** cohort by volume (41% QoQ), driven by:
- Strong organic referral loop among dev teams
- Your AI Chat feature is a major pull factor in this segment
- Average time-to-value < 3 days (vs 2 weeks industry avg)

**Recommendation:** Double down on product-led growth for SMB Tech. Consider a free tier with viral mechanics to accelerate this flywheel.`,
    timestamp: '10:03 AM',
  },
]
