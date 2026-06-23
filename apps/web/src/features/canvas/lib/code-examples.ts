/**
 * Hand-picked example snippets for the From-code drawer. Each one is
 * chosen because it produces a clean, multi-component diagram that
 * shows off icons + grouping + edge variants from a single click.
 */

export interface CodeExample {
  id: string;
  label: string;
  /** Short hint shown below the button. */
  description: string;
  /** Pre-filled into the From-code textarea. */
  code: string;
  /** Hint to bias Claude toward an appropriate diagram style. */
  hint: "auto" | "architecture" | "sequence" | "er" | "flowchart";
}

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: "docker-compose",
    label: "docker-compose",
    description: "Multi-service web app",
    hint: "architecture",
    code: `version: "3.9"
services:
  web:
    image: nginx
    ports: ["80:80"]
    depends_on: [api]
  api:
    image: node:20
    environment:
      DATABASE_URL: postgres://app@postgres:5432/app
      REDIS_URL: redis://cache:6379
    depends_on: [postgres, cache]
  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  cache:
    image: redis:7
  worker:
    image: node:20
    command: node worker.js
    depends_on: [postgres, cache]
volumes:
  pgdata: {}
`,
  },
  {
    id: "prisma",
    label: "Prisma schema",
    description: "ER-style relational model",
    hint: "er",
    code: `model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
}

model Post {
  id        String    @id @default(cuid())
  title     String
  body      String
  author    User      @relation(fields: [authorId], references: [id])
  authorId  String
  comments  Comment[]
  published Boolean   @default(false)
  createdAt DateTime  @default(now())
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  post      Post     @relation(fields: [postId], references: [id])
  postId    String
  createdAt DateTime @default(now())
}
`,
  },
  {
    id: "openapi",
    label: "OpenAPI",
    description: "API surface + handlers",
    hint: "architecture",
    code: `openapi: 3.1.0
info:
  title: Notes API
  version: 0.1.0
servers:
  - url: https://api.octofocus.ai/v1
paths:
  /notes:
    get:
      summary: List notes
      responses: { "200": { description: ok } }
    post:
      summary: Create note
      responses: { "201": { description: created } }
  /notes/{id}:
    get:
      summary: Get note
    patch:
      summary: Update note
    delete:
      summary: Delete note
  /notes/{id}/publish:
    post:
      summary: Publish note publicly
  /search:
    get:
      summary: Search notes
      parameters:
        - in: query
          name: q
          schema: { type: string }
`,
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    description: "Deployment + Service + Ingress",
    hint: "architecture",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: octo-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: octofocus/api:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: db, key: url }
---
apiVersion: v1
kind: Service
metadata:
  name: octo-api
spec:
  type: ClusterIP
  selector: { app: octo-api }
  ports: [{ port: 80, targetPort: 4000 }]
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: octo-api
spec:
  rules:
    - host: api.octofocus.ai
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service: { name: octo-api, port: { number: 80 } }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: octo-config
data:
  REDIS_URL: redis://cache:6379
`,
  },
  {
    id: "terraform",
    label: "Terraform",
    description: "AWS infrastructure",
    hint: "architecture",
    code: `provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "assets" {
  bucket = "octofocus-assets"
}

resource "aws_dynamodb_table" "sessions" {
  name           = "sessions"
  hash_key       = "id"
  billing_mode   = "PAY_PER_REQUEST"
  attribute { name = "id"  type = "S" }
}

resource "aws_lambda_function" "api" {
  function_name = "octo-api"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "api.zip"
  environment {
    variables = {
      ASSETS_BUCKET = aws_s3_bucket.assets.bucket
      SESSIONS_TABLE = aws_dynamodb_table.sessions.name
    }
  }
}

resource "aws_apigatewayv2_api" "gateway" {
  name          = "octo-api"
  protocol_type = "HTTP"
  target        = aws_lambda_function.api.invoke_arn
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "assets"
  }
  enabled = true
  default_cache_behavior {
    target_origin_id = "assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }
}
`,
  },
];
