import { cn } from '@/utils/cn'

const sizeClasses = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-7 h-7 text-xs',
  md:  'w-8 h-8 text-xs',
  lg:  'w-10 h-10 text-sm',
  xl:  'w-12 h-12 text-sm',
  '2xl': 'w-16 h-16 text-lg',
}

const colorMap: Record<string, string> = {
  A: 'from-violet-500 to-purple-700',
  B: 'from-violet-600 to-cyan-600',
  C: 'from-blue-500 to-indigo-600',
  D: 'from-emerald-500 to-teal-600',
  E: 'from-cyan-500 to-blue-600',
  F: 'from-rose-500 to-pink-700',
  G: 'from-amber-500 to-orange-600',
  H: 'from-violet-500 to-fuchsia-600',
  I: 'from-sky-500 to-blue-600',
  J: 'from-emerald-500 to-cyan-600',
  K: 'from-violet-400 to-purple-600',
  L: 'from-rose-400 to-red-600',
  M: 'from-amber-400 to-yellow-600',
  N: 'from-teal-500 to-emerald-600',
  O: 'from-orange-500 to-amber-600',
  P: 'from-violet-500 to-indigo-600',
  Q: 'from-cyan-600 to-teal-700',
  R: 'from-rose-500 to-red-600',
  S: 'from-sky-500 to-cyan-600',
  T: 'from-teal-500 to-green-600',
  U: 'from-violet-500 to-blue-600',
  V: 'from-emerald-500 to-green-600',
  W: 'from-purple-500 to-violet-700',
  X: 'from-slate-500 to-slate-700',
  Y: 'from-amber-500 to-yellow-500',
  Z: 'from-zinc-500 to-slate-600',
}

function getGradient(initials: string) {
  const first = (initials?.[0] ?? 'A').toUpperCase()
  return colorMap[first] ?? 'from-violet-600 to-cyan-600'
}

export interface AvatarProps {
  src?: string
  alt?: string
  initials?: string
  size?: keyof typeof sizeClasses
  className?: string
  online?: boolean
}

export function Avatar({ src, alt, initials = '?', size = 'md', className, online }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn('rounded-full object-cover ring-2 ring-orbit-border', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ring-2 ring-orbit-border',
            sizeClasses[size],
            getGradient(initials)
          )}
        >
          {initials.slice(0, 2).toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-orbit-surface',
            online ? 'bg-orbit-success' : 'bg-slate-500'
          )}
        />
      )}
    </div>
  )
}

export function AvatarGroup({ avatars, max = 4 }: { avatars: { initials: string; src?: string }[]; max?: number }) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((a, i) => (
        <Avatar key={i} initials={a.initials} src={a.src} size="sm" className="ring-2 ring-orbit-surface" />
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-orbit-surface3 border border-orbit-border flex items-center justify-center text-[10px] text-slate-400 font-medium z-10">
          +{overflow}
        </div>
      )}
    </div>
  )
}
