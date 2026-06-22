/**
 * Pragmatic icon → emoji map.
 *
 * v1 renders icons as a single-glyph prefix on the shape label rather
 * than as real SVGs — that's a 30-line dependency-free step that makes
 * code-to-diagram results read like architecture diagrams instead of
 * bare rectangles. The SVG icon catalog (Eraser's 1,824 names, see
 * `packages/diagrams/DSL.md` §10) lands in DSL v2 with a proper sprite
 * sheet. Until then, this map covers the most-emitted icon names
 * Claude reaches for from training-data familiarity with Eraser.
 *
 * Unknown names fall through to `null` and the renderer skips the
 * prefix — the rest of the styling (color, shape) still applies.
 */

export const ICON_EMOJI_MAP: Record<string, string> = {
  // Cloud / infra (generic)
  server: "🖥️",
  database: "🗄️",
  cloud: "☁️",
  storage: "💾",
  cache: "⚡",
  queue: "📬",
  monitor: "🖥️",
  container: "📦",

  // AWS (Claude emits these often when given AWS code)
  "aws-ec2": "🖥️",
  "aws-lambda": "λ",
  "aws-s3": "🪣",
  "aws-rds": "🗄️",
  "aws-dynamodb": "🗄️",
  "aws-api-gateway": "🚪",
  "aws-sqs": "📬",
  "aws-sns": "📣",
  "aws-cloudfront": "🌐",
  "aws-cloudwatch": "📊",
  "aws-iam": "🔐",
  "aws-route53": "🧭",
  "aws-eks": "☸️",
  "aws-ecs": "📦",

  // GCP
  "gcp-functions": "λ",
  "gcp-storage": "🪣",
  "gcp-bigquery": "📊",
  "gcp-pubsub": "📬",
  "gcp-gke": "☸️",

  // Azure
  "azure-vm": "🖥️",
  "azure-functions": "λ",
  "azure-storage": "🪣",
  "azure-sql": "🗄️",

  // Kubernetes
  "k8s-control-plane": "🎛️",
  "k8s-node": "🖥️",
  "k8s-etcd": "📒",
  "k8s-kubelet": "🤖",
  kubernetes: "☸️",

  // SaaS / dev tools (Claude knows these from Eraser docs)
  github: "🐙",
  gitlab: "🦊",
  slack: "💬",
  postgres: "🐘",
  postgresql: "🐘",
  mysql: "🐬",
  redis: "🔴",
  mongodb: "🍃",
  kafka: "🪶",
  rabbitmq: "🐰",
  elasticsearch: "🔎",
  nginx: "🟢",
  docker: "🐳",
  stripe: "💳",
  auth0: "🔐",
  supabase: "⚡",
  vercel: "▲",
  netlify: "🟢",
  cloudflare: "🟠",
  notion: "📝",
  linear: "📏",
  figma: "🎨",

  // Roles / people
  user: "👤",
  users: "👥",
  admin: "👤",
  developer: "👨‍💻",
  client: "💻",
  browser: "🌐",
  mobile: "📱",
  phone: "📞",

  // Generic Lucide-style
  zap: "⚡",
  flag: "🚩",
  mail: "✉️",
  bell: "🔔",
  lock: "🔒",
  key: "🔑",
  shield: "🛡️",
  bug: "🐛",
  star: "⭐",
  heart: "❤️",
  fire: "🔥",
  rocket: "🚀",
  package: "📦",
  folder: "📁",
  "file-text": "📄",
  search: "🔍",
  settings: "⚙️",
  gear: "⚙️",
  clock: "⏰",
  calendar: "📅",
  globe: "🌐",
  home: "🏠",
  warning: "⚠️",
  check: "✅",
  x: "❌",
  brain: "🧠",
  sparkles: "✨",
};

export function iconToEmoji(icon: string | undefined): string | null {
  if (!icon) return null;
  const normalized = icon.toLowerCase().trim();
  return ICON_EMOJI_MAP[normalized] ?? null;
}
