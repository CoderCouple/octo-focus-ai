import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppExceptionFilter } from "./common/error/app-exception.filter";
import { ResponseInterceptor } from "./common/interceptor/response.interceptor";
import { AppModule } from "./modules/app.module";

try {
  process.loadEnvFile("../../.env");
} catch {
  // running in an environment where env vars are already set (prod, CI)
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Allow raw binary uploads (meeting recordings POST audio as
  // application/octet-stream). Fastify's default JSON parser would
  // 415 these requests; the buffer parser collects up to 100MB.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: 100 * 1024 * 1024 },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(process.env.PORT ?? 4000);
  // Railway/Docker/most prod hosts inject PORT and need 0.0.0.0 to be reachable.
  // Locally we default to loopback for safety.
  const defaultHost = process.env.PORT ? "0.0.0.0" : "127.0.0.1";
  const host = process.env.HOST ?? defaultHost;
  await app.listen(port, host);
}

void bootstrap();

// touch 1782012056
