import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Download, Trash2, Edit, Search } from 'lucide-react'
import { Button, Badge, Avatar, AvatarGroup, Input, Card, CardHeader, CardBody } from '@/components/ui'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader title={title}>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </CardHeader>
        <CardBody className="pt-5">
          {children}
        </CardBody>
      </Card>
    </motion.div>
  )
}

export function ComponentsPage() {
  const [inputVal, setInputVal] = useState('')

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Component Showcase</h1>
        <p className="text-slate-500 text-sm mt-1">
          All Orbit UI components with their variants and sizes. Copy patterns directly into your pages.
        </p>
      </div>

      {/* Buttons */}
      <Section title="Buttons" description="6 variants × 6 sizes, loading state, icon support">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">XSmall</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">XLarge</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">States & Icons</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button icon={<Plus className="w-3.5 h-3.5" />}>Add Item</Button>
              <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
              <Button variant="ghost" icon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
              <Button variant="destructive" icon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>
              <Button size="icon"><Plus className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline"><Search className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges" description="7 semantic variants with optional dot indicator">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">With Dot</p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success" dot>Active</Badge>
              <Badge variant="warning" dot>Pending</Badge>
              <Badge variant="danger" dot>Failed</Badge>
              <Badge variant="info" dot>Draft</Badge>
              <Badge variant="primary" dot>New</Badge>
              <Badge variant="accent" dot>Live</Badge>
              <Badge variant="neutral" dot>Inactive</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Without Dot</p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Completed</Badge>
              <Badge variant="warning">In Review</Badge>
              <Badge variant="danger">Overdue</Badge>
              <Badge variant="info">Scheduled</Badge>
              <Badge variant="primary">Featured</Badge>
              <Badge variant="accent">Beta</Badge>
              <Badge variant="neutral">Archived</Badge>
            </div>
          </div>
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatars" description="Gradient initials, online indicator, and groups">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Sizes</p>
            <div className="flex items-end gap-4">
              <Avatar initials="AC" size="xs" />
              <Avatar initials="SK" size="sm" />
              <Avatar initials="MW" size="md" />
              <Avatar initials="PP" size="lg" />
              <Avatar initials="JL" size="xl" />
              <Avatar initials="ET" size="2xl" />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">With Online Status</p>
            <div className="flex items-center gap-4">
              <Avatar initials="AC" size="lg" online={true} />
              <Avatar initials="SK" size="lg" online={false} />
              <AvatarGroup
                avatars={[
                  { initials: 'AC' }, { initials: 'SK' }, { initials: 'MW' },
                  { initials: 'PP' }, { initials: 'JL' }, { initials: 'ET' },
                ]}
                max={4}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs" description="Label, prefix, suffix, error, and hint states">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Default" placeholder="Enter text..." value={inputVal} onChange={e => setInputVal(e.target.value)} />
          <Input label="With prefix" prefix={<Search className="w-3.5 h-3.5" />} placeholder="Search..." />
          <Input label="With suffix" suffix={<span className="text-xs">@orbit.io</span>} placeholder="username" />
          <Input label="With hint" placeholder="your@email.com" hint="We'll never share your email." />
          <Input label="Error state" placeholder="Enter value..." error="This field is required" />
          <Input label="Disabled" placeholder="Disabled input" disabled />
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards" description="Glass, gradient border, and standard variants">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Standard Card</h4>
            <p className="text-xs text-slate-500">Default surface with border</p>
          </Card>
          <Card glass className="p-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Glass Card</h4>
            <p className="text-xs text-slate-500">Backdrop blur + transparency</p>
          </Card>
          <Card gradient className="p-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Gradient Border</h4>
            <p className="text-xs text-slate-500">Violet → cyan gradient border</p>
          </Card>
        </div>
      </Section>

      {/* Color palette */}
      <Section title="Color System" description="Orbit's violet + cyan design tokens">
        <div className="space-y-3">
          {[
            { name: 'orbit-primary', hex: '#7C3AED', label: 'Primary (Violet)' },
            { name: 'orbit-primary-light', hex: '#8B5CF6', label: 'Primary Light' },
            { name: 'orbit-accent', hex: '#06B6D4', label: 'Accent (Cyan)' },
            { name: 'orbit-accent-light', hex: '#22D3EE', label: 'Accent Light' },
            { name: 'orbit-success', hex: '#10B981', label: 'Success' },
            { name: 'orbit-warning', hex: '#F59E0B', label: 'Warning' },
            { name: 'orbit-danger', hex: '#EF4444', label: 'Danger' },
          ].map(color => (
            <div key={color.name} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 ring-1 ring-white/10"
                style={{ background: color.hex }}
              />
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium">{color.label}</p>
                <p className="text-xs text-slate-500 font-mono">{color.hex} — bg-{color.name}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
