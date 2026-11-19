import { useMemo } from 'react'
import { svgDataUrl } from '../lib/svg'
import { AppImage } from './AppImage'
import {
  BarChart3,
  Bell,
  BellRing,
  Bot,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  FileText,
  Flame,
  Goal,
  Heart,
  ImageDown,
  Info,
  Landmark,
  Loader2,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquare,
  Newspaper,
  PlayCircle,
  Repeat2,
  Search,
  Send,
  Share2,
  Sparkles,
  Ticket,
  Trophy,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide'

const ICONS = {
  chart: BarChart3,
  bell: Bell,
  bellRing: BellRing,
  bot: Bot,
  calendar: CalendarDays,
  calendarPlus: CalendarPlus,
  check: Check,
  back: ChevronLeft,
  right: ChevronRight,
  clock: Clock,
  compass: Compass,
  download: Download,
  file: FileText,
  flame: Flame,
  goal: Goal,
  heart: Heart,
  imageDown: ImageDown,
  info: Info,
  landmark: Landmark,
  loading: Loader2,
  logout: LogOut,
  pin: MapPin,
  megaphone: Megaphone,
  message: MessageSquare,
  news: Newspaper,
  play: PlayCircle,
  repeat: Repeat2,
  search: Search,
  send: Send,
  share: Share2,
  sparkles: Sparkles,
  ticket: Ticket,
  trophy: Trophy,
  user: UserRound,
  food: UtensilsCrossed,
  close: X,
}

export type IconName = keyof typeof ICONS

type Attrs = Record<string, string | number>
type Node = readonly [string, Attrs, ...unknown[]]

const cache = new Map<string, string>()

function serializeNode(node: Node): string {
  const [tag, attrs, children] = node
  const props = Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ')
  if (Array.isArray(children) && children.length > 0) {
    return `<${tag} ${props}>${children.map((c) => serializeNode(c as Node)).join('')}</${tag}>`
  }
  return `<${tag} ${props}/>`
}

function strokeColor(color: string) {
  const m = color.match(/^rgba?\(([^)]+)\)$/)
  if (!m) return { stroke: color, opacity: '' }
  const [r, g, b, a] = m[1].split(',').map((v) => v.trim())
  return {
    stroke: `rgb(${r}, ${g}, ${b})`,
    opacity: a === undefined ? '' : ` stroke-opacity="${a}"`,
  }
}

function dataUrl(node: readonly Node[], color: string, strokeWidth: number) {
  const key = `${JSON.stringify(node)}|${color}|${strokeWidth}`
  const hit = cache.get(key)
  if (hit) return hit
  const body = node.map(serializeNode).join('')
  const { stroke, opacity } = strokeColor(color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}"${opacity} stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  const url = svgDataUrl(svg)
  cache.set(key, url)
  return url
}

export function Icon({
  name,
  size = 18,
  color = '#141011',
  strokeWidth = 2,
  className,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}) {
  const node = ICONS[name] as unknown as readonly Node[]
  const src = useMemo(() => dataUrl(node, color, strokeWidth), [node, color, strokeWidth])
  return (
    <AppImage
      className={className}
      src={src}
      mode='aspectFit'
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
    />
  )
}
