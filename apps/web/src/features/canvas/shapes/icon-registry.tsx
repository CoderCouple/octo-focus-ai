/**
 * Icon registry — maps DSL `[icon: name]` values to Lucide React
 * components. Lucide tree-shakes, so importing 50+ icons doesn't bloat
 * the bundle.
 *
 * Strategy:
 *   - Generic icons (`user`, `mail`, `key`, …) map 1:1 to Lucide.
 *   - SaaS icons (`github`, `slack`) use Lucide's brand icons.
 *   - Cloud icons (`aws-lambda`, `gcp-functions`, `k8s-node`, …) map
 *     to the closest generic Lucide icon (Zap, Database, Server, …).
 *     This is graceful degradation — real per-provider SVGs land in
 *     a later commit when we vendor the official AWS / GCP / Azure
 *     icon sets.
 *   - Anything unknown falls through to null and the renderer falls
 *     back to the emoji glyph from `@octofocus/diagrams`.
 */
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Bell,
  Box,
  Brain,
  Bug,
  Calendar,
  Check,
  Cloud,
  CloudCog,
  Code,
  Cog,
  Compass,
  Container,
  CreditCard,
  Database,
  FileText,
  Flag,
  Flame,
  Folder,
  GitMerge,
  Globe,
  Hash,
  Heart,
  Home,
  Key,
  KeyRound,
  Layers,
  Link as LinkIcon,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Monitor,
  Network,
  Package,
  Phone,
  Repeat,
  Rocket,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Terminal,
  User,
  UserCog,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // ---- generic / Lucide-native ----
  user: User,
  users: Users,
  admin: UserCog,
  developer: Terminal,
  client: Monitor,
  browser: Globe,
  mobile: Smartphone,
  phone: Phone,
  monitor: Monitor,
  shield: Shield,
  key: Key,
  lock: Lock,
  mail: Mail,
  bell: Bell,
  bug: Bug,
  zap: Zap,
  gear: Cog,
  settings: Settings,
  brain: Brain,
  sparkles: Sparkles,
  flag: Flag,
  package: Package,
  folder: Folder,
  "file-text": FileText,
  search: Search,
  calendar: Calendar,
  clock: Repeat,
  globe: Globe,
  home: Home,
  warning: AlertTriangle,
  check: Check,
  x: X,
  fire: Flame,
  rocket: Rocket,
  heart: Heart,
  star: Star,
  link: LinkIcon,
  "message-circle": MessageCircle,
  alert: AlertCircle,
  send: Send,
  repeat: Repeat,

  // ---- infra primitives ----
  server: Server,
  database: Database,
  cloud: Cloud,
  storage: Archive,
  cache: Zap,
  queue: MessageSquare,
  container: Container,
  network: Network,

  // ---- AWS (mapped to closest generic Lucide) ----
  "aws-ec2": Server,
  "aws-lambda": Zap,
  "aws-s3": Archive,
  "aws-rds": Database,
  "aws-dynamodb": Database,
  "aws-api-gateway": Globe,
  "aws-sqs": MessageSquare,
  "aws-sns": Send,
  "aws-cloudfront": Cloud,
  "aws-cloudwatch": AlertCircle,
  "aws-iam": ShieldCheck,
  "aws-route53": Compass,
  "aws-eks": Layers,
  "aws-ecs": Container,
  aws: Cloud,

  // ---- GCP ----
  "gcp-functions": Zap,
  "gcp-storage": Archive,
  "gcp-bigquery": Database,
  "gcp-pubsub": MessageSquare,
  "gcp-gke": Layers,
  "google-cloud": Cloud,
  gcp: Cloud,

  // ---- Azure ----
  "azure-vm": Server,
  "azure-functions": Zap,
  "azure-storage": Archive,
  "azure-sql": Database,
  azure: Cloud,

  // ---- Kubernetes ----
  "k8s-control-plane": CloudCog,
  "k8s-node": Server,
  "k8s-etcd": Database,
  "k8s-kubelet": Container,
  kubernetes: Layers,
  k8s: Layers,

  // ---- Data stores ----
  postgres: Database,
  postgresql: Database,
  mysql: Database,
  redis: Database,
  mongodb: Database,
  kafka: MessageSquare,
  rabbitmq: MessageSquare,
  elasticsearch: Search,

  // ---- SaaS / dev tools ----
  github: GitMerge,
  gitlab: GitMerge,
  slack: Hash,
  stripe: CreditCard,
  auth0: KeyRound,
  supabase: Zap,
  vercel: Cloud,
  netlify: Cloud,
  cloudflare: Cloud,
  nginx: Server,
  docker: Container,
  notion: FileText,
  linear: Layers,
  figma: Code,
  tensorflow: Brain,
};

export function getIconComponent(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  const normalised = name.toLowerCase().trim();
  return ICON_REGISTRY[normalised] ?? null;
}
