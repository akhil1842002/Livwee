import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BookOpen, Code2, Zap, MessageSquare,
  ChevronDown, ExternalLink, FileText, Lightbulb,
} from 'lucide-react'
import { Input, Card, CardBody, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'

const quickLinks = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Full guide to every page, component, and configuration option',
    badge: undefined,
    color: 'text-orbit-primary-light',
    bg: 'bg-orbit-primary/10',
  },
  {
    icon: Code2,
    title: 'API Integration',
    description: 'LLM-ready docs to wire up your backend in minutes',
    badge: 'New',
    color: 'text-orbit-accent-light',
    bg: 'bg-orbit-accent/10',
  },
  {
    icon: Zap,
    title: 'Changelog',
    description: "What's new in the latest version of Orbit",
    badge: 'v1.0',
    color: 'text-amber-400',
    bg: 'bg-orbit-warning/10',
  },
  {
    icon: MessageSquare,
    title: 'Community',
    description: 'Ask questions, share ideas, and connect with other Orbit users',
    badge: undefined,
    color: 'text-emerald-400',
    bg: 'bg-orbit-success/10',
  },
]

const faqs = [
  {
    q: 'How do I connect Orbit to my own API?',
    a: 'Check the `docs/api-integration/` folder in the project root. It contains structured markdown files (overview, authentication, AI chat, dashboard API) designed to be pasted directly into Claude or ChatGPT so an AI can generate the integration code for you. Start with `overview.md`.',
  },
  {
    q: 'How does the dark/light mode work?',
    a: 'The theme toggle in the top bar (sun/moon icon) switches between dark and light mode. You can also change it in Settings → Appearance. The preference is saved in localStorage, so it persists across sessions. The theme system uses CSS custom properties that update at runtime — no page reload needed.',
  },
  {
    q: 'Can I change the primary color from violet?',
    a: 'Yes. Open `src/index.css` and find the `--color-orbit-primary` and `--color-orbit-accent` values in the `@theme {}` block. Change them to any hex color. You can also preview this in Settings → Appearance → Accent Color (color switcher coming in a future update).',
  },
  {
    q: 'How do I add a new page?',
    a: 'Three steps: (1) Create a new `.tsx` file in `src/pages/your-feature/YourPage.tsx`. (2) Add a route in `src/App.tsx` inside the Layout route. (3) Add a nav item in `src/data/navigation.ts`. The page will automatically get the sidebar + topbar layout.',
  },
  {
    q: 'How do I wire up real AI chat?',
    a: 'See `docs/api-integration/ai-chat.md`. It contains a complete example for streaming responses from the Claude API (recommended) or OpenAI. The key is to route requests through your backend — never call AI APIs directly from the browser since it exposes your API key.',
  },
  {
    q: 'Is Orbit free to use commercially?',
    a: 'Yes. Orbit is released under the MIT License, which allows free use for personal and commercial projects. You can build products with it, sell products built on it, and modify it however you like. Attribution is appreciated but not required.',
  },
  {
    q: 'How do I add more chart types?',
    a: 'Orbit uses Recharts. You can import any Recharts component (BarChart, RadialBarChart, ScatterChart, etc.) directly in your page files. All chart components accept our theme colors via CSS custom properties. See the Dashboard page source for examples.',
  },
  {
    q: 'How do I deploy this template?',
    a: 'Run `npm run build` to get a production-ready `dist/` folder. Deploy to Vercel (zero config), Netlify, or any static hosting. For Vercel: connect your GitHub repo and it deploys automatically. For SPAs, make sure to configure your host to redirect all paths to `index.html`.',
  },
]

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-orbit-border last:border-0"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-slate-200">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-slate-400 leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function HelpPage() {
  const [search, setSearch] = useState('')

  const filteredFaqs = faqs.filter(
    faq =>
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Help & Documentation</h1>
        <p className="text-slate-500 text-sm mt-1">
          Everything you need to get the most out of Orbit
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Input
          prefix={<Search className="w-4 h-4" />}
          placeholder="Search documentation and FAQs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm"
        />
      </motion.div>

      {/* Quick links */}
      {!search && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((link, i) => (
              <motion.button
                key={link.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4 p-4 rounded-xl border border-orbit-border bg-orbit-surface hover:border-orbit-border2 hover:bg-orbit-surface2 transition-all text-left group"
              >
                <div className={cn('p-2.5 rounded-lg flex-shrink-0', link.bg)}>
                  <link.icon className={cn('w-5 h-5', link.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200">{link.title}</p>
                    {link.badge && <Badge variant="primary">{link.badge}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{link.description}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {!search && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orbit-accent/10 flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-orbit-accent-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-1">Pro tip — AI-assisted integration</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The <code className="text-xs bg-orbit-surface2 px-1.5 py-0.5 rounded text-orbit-accent-light font-mono">docs/api-integration/</code> folder contains structured markdown files designed to be pasted into Claude or ChatGPT. Drop{' '}
                  <code className="text-xs bg-orbit-surface2 px-1.5 py-0.5 rounded text-orbit-accent-light font-mono">overview.md</code> +{' '}
                  <code className="text-xs bg-orbit-surface2 px-1.5 py-0.5 rounded text-orbit-accent-light font-mono">ai-chat.md</code> into Claude and ask it to wire up your AI backend — it'll generate all the code in minutes.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            {search ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? 's' : ''}` : 'Frequently Asked Questions'}
          </h2>
        </div>
        <Card>
          <CardBody className="divide-y-0 py-0 px-5">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-slate-500 text-sm">No results for "{search}"</p>
                <p className="text-slate-600 text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Contact support */}
      {!search && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-4"
        >
          <p className="text-sm text-slate-500">
            Still stuck?{' '}
            <a
              href="https://github.com/orbitdash/orbit/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orbit-primary-light hover:text-orbit-accent transition-colors font-medium"
            >
              Open an issue on GitHub
            </a>
          </p>
        </motion.div>
      )}
    </div>
  )
}
