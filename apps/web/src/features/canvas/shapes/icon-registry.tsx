/**
 * Icon registry — maps DSL `[icon: name]` values to bundled Iconify
 * icons. We use two collections statically:
 *
 *   @iconify-icons/logos   real branded SVGs (AWS Lambda, Postgres, Slack…)
 *   @iconify-icons/lucide  generic dev/UI glyphs (user, mail, shield, zap…)
 *
 * Every icon is a static import — webpack/Vite tree-shakes so only the
 * ones referenced here land in the client bundle. No CDN dependency,
 * no runtime fetch, no API rate limit, no graceful fallback that
 * surprises users at render time.
 *
 * Adding a new icon name: pick a collection, import the file, add a
 * row to ICON_REGISTRY. Mapping to a Lucide stand-in is the explicit
 * fallback for things @iconify-icons/logos doesn't have (e.g. K8s
 * sub-components like etcd).
 */
import { Icon, type IconifyIcon } from "@iconify/react";

/* --- Branded service icons (logos collection) --- */
import awsApiGateway from "@iconify-icons/logos/aws-api-gateway";
import awsCloudfront from "@iconify-icons/logos/aws-cloudfront";
import awsCloudwatch from "@iconify-icons/logos/aws-cloudwatch";
import awsDynamodb from "@iconify-icons/logos/aws-dynamodb";
import awsEc2 from "@iconify-icons/logos/aws-ec2";
import awsEcs from "@iconify-icons/logos/aws-ecs";
import awsEks from "@iconify-icons/logos/aws-eks";
import awsIam from "@iconify-icons/logos/aws-iam";
import awsLambda from "@iconify-icons/logos/aws-lambda";
import awsRds from "@iconify-icons/logos/aws-rds";
import awsRoute53 from "@iconify-icons/logos/aws-route53";
import awsS3 from "@iconify-icons/logos/aws-s3";
import awsSns from "@iconify-icons/logos/aws-sns";
import auth0 from "@iconify-icons/logos/auth0-icon";
import aws from "@iconify-icons/logos/aws";
import azure from "@iconify-icons/logos/azure-icon";
import cloudflare from "@iconify-icons/logos/cloudflare";
import docker from "@iconify-icons/logos/docker-icon";
import elasticsearch from "@iconify-icons/logos/elasticsearch";
import figma from "@iconify-icons/logos/figma";
import githubLogo from "@iconify-icons/logos/github-icon";
import gitlab from "@iconify-icons/logos/gitlab";
import googleCloud from "@iconify-icons/logos/google-cloud";
import googleCloudFunctions from "@iconify-icons/logos/google-cloud-functions";
import googleCloudRun from "@iconify-icons/logos/google-cloud-run";
import kafka from "@iconify-icons/logos/kafka-icon";
import kubernetes from "@iconify-icons/logos/kubernetes";
import mongodb from "@iconify-icons/logos/mongodb-icon";
import mysql from "@iconify-icons/logos/mysql-icon";
import netlify from "@iconify-icons/logos/netlify-icon";
import nginx from "@iconify-icons/logos/nginx";
import notion from "@iconify-icons/logos/notion-icon";
import postgresql from "@iconify-icons/logos/postgresql";
import redis from "@iconify-icons/logos/redis";
import slack from "@iconify-icons/logos/slack-icon";
import stripe from "@iconify-icons/logos/stripe";
import supabase from "@iconify-icons/logos/supabase-icon";
import terraformIcon from "@iconify-icons/logos/terraform-icon";
import vercel from "@iconify-icons/logos/vercel-icon";

/* --- Generic UI / people / abstract glyphs (lucide collection) --- */
import lcAlertCircle from "@iconify-icons/lucide/alert-circle";
import lcArchive from "@iconify-icons/lucide/archive";
import lcBell from "@iconify-icons/lucide/bell";
import lcBrain from "@iconify-icons/lucide/brain";
import lcBug from "@iconify-icons/lucide/bug";
import lcCalendar from "@iconify-icons/lucide/calendar";
import lcCheck from "@iconify-icons/lucide/check";
import lcCloud from "@iconify-icons/lucide/cloud";
import lcCloudCog from "@iconify-icons/lucide/cloud-cog";
import lcCog from "@iconify-icons/lucide/cog";
import lcCompass from "@iconify-icons/lucide/compass";
import lcContainer from "@iconify-icons/lucide/container";
import lcCpu from "@iconify-icons/lucide/cpu";
import lcDatabase from "@iconify-icons/lucide/database";
import lcFileText from "@iconify-icons/lucide/file-text";
import lcFlag from "@iconify-icons/lucide/flag";
import lcFlame from "@iconify-icons/lucide/flame";
import lcFolder from "@iconify-icons/lucide/folder";
import lcGlobe from "@iconify-icons/lucide/globe";
import lcHeart from "@iconify-icons/lucide/heart";
import lcHome from "@iconify-icons/lucide/home";
import lcKey from "@iconify-icons/lucide/key";
import lcLayers from "@iconify-icons/lucide/layers";
import lcLink from "@iconify-icons/lucide/link";
import lcLock from "@iconify-icons/lucide/lock";
import lcMail from "@iconify-icons/lucide/mail";
import lcMessageCircle from "@iconify-icons/lucide/message-circle";
import lcMessageSquare from "@iconify-icons/lucide/message-square";
import lcMonitor from "@iconify-icons/lucide/monitor";
import lcNetwork from "@iconify-icons/lucide/network";
import lcPackage from "@iconify-icons/lucide/package";
import lcPhone from "@iconify-icons/lucide/phone";
import lcRepeat from "@iconify-icons/lucide/repeat";
import lcRocket from "@iconify-icons/lucide/rocket";
import lcSearch from "@iconify-icons/lucide/search";
import lcSend from "@iconify-icons/lucide/send";
import lcServer from "@iconify-icons/lucide/server";
import lcShield from "@iconify-icons/lucide/shield";
import lcShieldCheck from "@iconify-icons/lucide/shield-check";
import lcSmartphone from "@iconify-icons/lucide/smartphone";
import lcSparkles from "@iconify-icons/lucide/sparkles";
import lcStar from "@iconify-icons/lucide/star";
import lcTerminal from "@iconify-icons/lucide/terminal";
import lcUser from "@iconify-icons/lucide/user";
import lcUserCog from "@iconify-icons/lucide/user-cog";
import lcUsers from "@iconify-icons/lucide/users";
import lcX from "@iconify-icons/lucide/x";
import lcZap from "@iconify-icons/lucide/zap";

const REGISTRY: Record<string, IconifyIcon> = {
  // --- AWS (real AWS Architecture icons via Iconify logos) ---
  "aws-api-gateway": awsApiGateway,
  "aws-cloudfront": awsCloudfront,
  "aws-cloudwatch": awsCloudwatch,
  "aws-dynamodb": awsDynamodb,
  "aws-ec2": awsEc2,
  "aws-ecs": awsEcs,
  "aws-eks": awsEks,
  "aws-iam": awsIam,
  "aws-lambda": awsLambda,
  "aws-rds": awsRds,
  "aws-route53": awsRoute53,
  "aws-s3": awsS3,
  "aws-sns": awsSns,
  // No dedicated SQS in logos — reuse SNS as the closest brand icon.
  "aws-sqs": awsSns,
  aws: aws,

  // --- GCP ---
  "gcp-functions": googleCloudFunctions,
  // GCP storage / bigquery / pubsub / GKE don't have dedicated logos
  // entries — fall back to the GCP umbrella icon so they still read as
  // Google Cloud services.
  "gcp-storage": googleCloud,
  "gcp-bigquery": googleCloud,
  "gcp-pubsub": googleCloud,
  "gcp-gke": googleCloud,
  "gcp-run": googleCloudRun,
  "google-cloud": googleCloud,
  gcp: googleCloud,

  // --- Azure ---
  "azure-vm": azure,
  "azure-functions": azure,
  "azure-storage": azure,
  "azure-sql": azure,
  azure: azure,

  // --- Kubernetes ---
  // Logos has the main K8s wheel; the sub-components (control plane,
  // etcd, kubelet, node) fall back to it so the diagram still reads.
  "k8s-control-plane": kubernetes,
  "k8s-node": kubernetes,
  "k8s-etcd": kubernetes,
  "k8s-kubelet": kubernetes,
  kubernetes: kubernetes,
  k8s: kubernetes,

  // --- Data stores ---
  postgres: postgresql,
  postgresql: postgresql,
  mysql: mysql,
  redis: redis,
  mongodb: mongodb,
  kafka: kafka,
  // No rabbitmq in logos at the time of writing — use a message icon.
  rabbitmq: lcMessageSquare,
  elasticsearch: elasticsearch,

  // --- SaaS / dev tools ---
  github: githubLogo,
  gitlab: gitlab,
  slack: slack,
  stripe: stripe,
  auth0: auth0,
  supabase: supabase,
  vercel: vercel,
  netlify: netlify,
  cloudflare: cloudflare,
  nginx: nginx,
  docker: docker,
  notion: notion,
  figma: figma,
  terraform: terraformIcon,
  // No tensorflow in logos — fall back to brain glyph.
  tensorflow: lcBrain,

  // --- Generic infra primitives (Lucide) ---
  server: lcServer,
  database: lcDatabase,
  cloud: lcCloud,
  storage: lcArchive,
  cache: lcZap,
  queue: lcMessageSquare,
  container: lcContainer,
  network: lcNetwork,
  cpu: lcCpu,

  // --- People / clients ---
  user: lcUser,
  users: lcUsers,
  admin: lcUserCog,
  developer: lcTerminal,
  client: lcMonitor,
  browser: lcGlobe,
  mobile: lcSmartphone,
  phone: lcPhone,
  monitor: lcMonitor,

  // --- Lucide-style generics ---
  shield: lcShield,
  key: lcKey,
  lock: lcLock,
  mail: lcMail,
  bell: lcBell,
  bug: lcBug,
  zap: lcZap,
  gear: lcCog,
  settings: lcCog,
  brain: lcBrain,
  sparkles: lcSparkles,
  flag: lcFlag,
  package: lcPackage,
  folder: lcFolder,
  "file-text": lcFileText,
  search: lcSearch,
  calendar: lcCalendar,
  clock: lcRepeat,
  globe: lcGlobe,
  home: lcHome,
  warning: lcAlertCircle,
  alert: lcAlertCircle,
  check: lcCheck,
  x: lcX,
  fire: lcFlame,
  rocket: lcRocket,
  heart: lcHeart,
  star: lcStar,
  link: lcLink,
  send: lcSend,
  repeat: lcRepeat,
  "message-circle": lcMessageCircle,
  layers: lcLayers,
  "shield-check": lcShieldCheck,
  "cloud-cog": lcCloudCog,
  compass: lcCompass,
};

export interface NodeIconProps {
  /** DSL `[icon: name]` value. Looked up case-insensitively. */
  name: string | undefined;
  /** Pixel size. Defaults to 18 (good for a 28-pixel tile). */
  size?: number;
  className?: string;
}

/**
 * Renders the icon for a given DSL name, or `null` when the name is
 * unknown. The renderer should fall back to the emoji glyph from
 * `@octofocus/diagrams` (or skip the icon) when this returns null.
 */
export function NodeIcon({ name, size = 18, className }: NodeIconProps) {
  if (!name) return null;
  const icon = REGISTRY[name.toLowerCase().trim()];
  if (!icon) return null;
  return <Icon icon={icon} width={size} height={size} className={className} />;
}

/** Cheap existence check for the renderer. */
export function hasIcon(name: string | undefined): boolean {
  if (!name) return false;
  return Boolean(REGISTRY[name.toLowerCase().trim()]);
}
