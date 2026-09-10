import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Search, Sparkles, ChevronDown,
  Copy, ThumbsUp, ThumbsDown, RefreshCw, Paperclip, Menu, X,
} from 'lucide-react'
import { Button, Input, Avatar } from '@/components/ui'
import { conversations, initialMessages } from '@/data/messages'
import { cn } from '@/utils/cn'
import type { ChatMessage } from '@/types'

const models = ['claude-sonnet-4-6', 'claude-opus-4-8', 'gpt-4o'] as const
type Model = typeof models[number]

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={i} className="font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1">{line.slice(2, -2)}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 text-slate-700 dark:text-slate-300 list-disc marker:text-orbit-primary">
          {formatInline(line.slice(2))}
        </li>
      )
    } else if (line.startsWith('| ') && line.includes('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^\|[-| :]+\|$/)) {
          rows.push(lines[i].split('|').filter(Boolean).map(c => c.trim()))
        }
        i++
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-orbit-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-orbit-border bg-slate-100 dark:bg-orbit-surface2">
                {rows[0]?.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, j) => (
                <tr key={j} className="border-b border-slate-100 dark:border-orbit-border last:border-0 hover:bg-slate-50 dark:hover:bg-white/2">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(<p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed">{formatInline(line)}</p>)
    }
    i++
  }

  return <div className="text-sm space-y-0.5">{elements}</div>
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>
      : part
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-orbit-primary"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  )
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [model, setModel] = useState<Model>('claude-sonnet-4-6')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [activeConv, setActiveConv] = useState('1')
  const [showConvList, setShowConvList] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = () => {
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

    setTimeout(() => {
      setIsTyping(false)
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm analyzing your request: **"${userMsg.content}"**\n\nThis is a demo response. To connect real AI capabilities, see the [API integration docs](/docs/api-integration/overview.md) in this repository — they contain structured context you can paste directly into Claude or ChatGPT to wire up your backend in minutes.\n\n**Quick integration steps:**\n- Choose your model (Claude recommended for business analytics)\n- Pass your dashboard context in the system prompt\n- Stream responses for the best UX`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(m => [...m, aiMsg])
    }, 1800)
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-orbit-bg">
      {/* Mobile conv list overlay */}
      <AnimatePresence>
        {showConvList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setShowConvList(false)}
          />
        )}
      </AnimatePresence>

      {/* Conversation list — desktop: always visible, mobile: slide-in drawer */}
      <div
        className={cn(
          'flex-shrink-0 w-64 border-r border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface flex flex-col',
          'fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out',
          'md:relative md:inset-auto md:z-auto',
          showConvList ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-3 border-b border-slate-200 dark:border-orbit-border flex items-center gap-2">
          <div className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-slate-200 dark:border-orbit-border" icon={<Plus className="w-3.5 h-3.5" />}>
              New Chat
            </Button>
          </div>
          <button
            onClick={() => setShowConvList(false)}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <Input prefix={<Search className="w-3.5 h-3.5" />} placeholder="Search conversations..." />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setActiveConv(conv.id); setShowConvList(false) }}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
                activeConv === conv.id
                  ? 'bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/20'
                  : 'hover:bg-slate-100 dark:hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className={cn('w-3 h-3 flex-shrink-0', activeConv === conv.id ? 'text-orbit-primary-light dark:text-orbit-primary-light' : 'text-slate-400 dark:text-slate-600')} />
                <p className={cn(
                  'text-xs font-medium truncate',
                  activeConv === conv.id ? 'text-slate-900 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'
                )}>
                  {conv.title}
                </p>
                {conv.unread && <div className="w-1.5 h-1.5 rounded-full bg-orbit-accent flex-shrink-0 ml-auto" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate ml-5">{conv.lastMessage}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 ml-5 mt-0.5">{conv.timestamp}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Chat header */}
        <div className="h-14 border-b border-slate-200 dark:border-orbit-border px-4 flex items-center gap-3 bg-white/80 dark:bg-orbit-surface/60 backdrop-blur-xl flex-shrink-0">
          {/* Mobile conv list toggle */}
          <button
            onClick={() => setShowConvList(true)}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="w-7 h-7 rounded-lg bg-orbit-primary/10 dark:bg-orbit-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-orbit-primary-light dark:text-orbit-primary-light" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">Orbit AI</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Business intelligence assistant</p>
          </div>
          <div className="ml-auto relative flex-shrink-0">
            <button
              onClick={() => setShowModelPicker(o => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-orbit-surface2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-orbit-border transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-orbit-accent animate-pulse" />
              <span className="hidden sm:inline">{model}</span>
              <span className="sm:hidden">Model</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showModelPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 bg-white dark:bg-orbit-surface2 border border-slate-200 dark:border-orbit-border rounded-xl shadow-2xl z-50 overflow-hidden min-w-48"
                  >
                    {models.map(m => (
                      <button
                        key={m}
                        onClick={() => { setModel(m); setShowModelPicker(false) }}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-white/5',
                          m === model ? 'text-orbit-primary-light dark:text-orbit-primary-light font-medium' : 'text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-lg bg-orbit-primary dark:bg-orbit-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Avatar initials="A" size="sm" className="mt-0.5 flex-shrink-0" />
              )}

              <div className={cn('max-w-2xl min-w-0', msg.role === 'user' && 'items-end flex flex-col')}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 shadow-sm',
                  msg.role === 'user'
                    ? 'bg-orbit-primary dark:bg-orbit-primary text-white rounded-tr-sm'
                    : 'bg-white dark:bg-orbit-surface2 border border-slate-200 dark:border-orbit-border rounded-tl-sm'
                )}>
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}
                </div>
                <div className={cn(
                  'flex items-center gap-2 mt-1.5',
                  msg.role === 'user' && 'flex-row-reverse'
                )}>
                  <span className="text-[11px] text-slate-500 dark:text-slate-500">{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1">
                      {[Copy, ThumbsUp, ThumbsDown, RefreshCw].map((Icon, i) => (
                        <button key={i} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded">
                          <Icon className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-orbit-primary dark:bg-orbit-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-orbit-surface2 border border-slate-200 dark:border-orbit-border rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area — always pinned to bottom */}
        <div className="border-t border-slate-200 dark:border-orbit-border p-4 bg-white/80 dark:bg-orbit-surface/60 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-end gap-3 bg-slate-50 dark:bg-orbit-surface2 border border-slate-200 dark:border-orbit-border rounded-2xl px-4 py-3 focus-within:border-orbit-primary/50 dark:focus-within:border-orbit-primary/50 transition-colors">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-0.5 hidden sm:block">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask anything about your business data..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ minHeight: '20px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={cn(
                'p-2 rounded-xl transition-all flex-shrink-0',
                input.trim() && !isTyping
                  ? 'bg-orbit-primary dark:bg-orbit-primary text-white hover:bg-orbit-primary/50 dark:hover:bg-orbit-primary-light shadow-sm shadow-orbit-primary/30'
                  : 'bg-slate-200 dark:bg-orbit-surface3 text-slate-400 dark:text-slate-600'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-600 text-center mt-2 hidden sm:block">
            Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-orbit-surface3 rounded text-slate-600 dark:text-slate-500 text-[10px]">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-orbit-surface3 rounded text-slate-600 dark:text-slate-500 text-[10px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  )
}
