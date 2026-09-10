# AI Chat Integration
> Paste into Claude: "Wire up Orbit's ChatPage.tsx to Claude's Messages API for streaming responses"

## Current State
`src/pages/ai/ChatPage.tsx` uses a `setTimeout` mock. Real integration requires streaming the AI response.

## Claude API (Recommended)
### Setup
```bash
npm install @anthropic-ai/sdk
```
> **Important:** Never call the Anthropic API directly from the browser — your API key will be exposed.
> Route requests through your backend.

### Backend endpoint (Node/Express example)
```typescript
// POST /ai/chat
// Body: { messages: {role, content}[], model: string }
// Response: Server-Sent Events stream

import Anthropic from '@anthropic-ai/sdk'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.post('/ai/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  const stream = anthropic.messages.stream({
    model: req.body.model ?? 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are an AI assistant integrated into Orbit, a business dashboard. 
             The user manages a SaaS product. Help them analyze their data and metrics.
             Current date: ${new Date().toISOString().split('T')[0]}`,
    messages: req.body.messages,
  })

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
    }
  }
  res.write('data: [DONE]\n\n')
  res.end()
})
```

### Frontend — update handleSend in ChatPage.tsx
```typescript
const handleSend = async () => {
  if (!input.trim()) return
  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: input.trim(),
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
  setMessages(m => [...m, userMsg])
  setInput('')
  setIsTyping(true)

  // Create placeholder AI message for streaming
  const aiId = (Date.now() + 1).toString()
  const aiMsg: ChatMessage = {
    id: aiId, role: 'assistant', content: '', timestamp: '',
  }
  setMessages(m => [...m, aiMsg])

  // Stream from backend
  const response = await fetch('/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('orbit_token')}` },
    body: JSON.stringify({
      model,
      messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
    }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  setIsTyping(false)

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n').filter(Boolean)
    for (const line of lines) {
      if (line === 'data: [DONE]') break
      if (line.startsWith('data: ')) {
        const { text } = JSON.parse(line.slice(6))
        setMessages(m => m.map(msg => msg.id === aiId
          ? { ...msg, content: msg.content + text, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
          : msg
        ))
      }
    }
  }
}
```

## OpenAI API
Same pattern — replace the backend with:
```typescript
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const stream = await openai.chat.completions.create({
  model: req.body.model ?? 'gpt-4o',
  messages: req.body.messages,
  stream: true,
})
for await (const chunk of stream) {
  const text = chunk.choices[0]?.delta?.content ?? ''
  if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
}
```

## Model selector
The model dropdown in ChatPage.tsx already handles model switching.
Update the `models` array to match what your backend supports:
```typescript
const models = ['claude-sonnet-4-6', 'claude-opus-4-8', 'gpt-4o'] as const
```
