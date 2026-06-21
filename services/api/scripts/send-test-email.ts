/**
 * Resend smoke-test. Mirrors the Resend quickstart snippet — uses the
 * universal test sender `onboarding@resend.dev` so it works *before* you
 * verify octofocus.ai. The only constraint with the test sender is that
 * `to` must be the email tied to your Resend account.
 *
 * Run:
 *   cd services/api && pnpm tsx scripts/send-test-email.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { Resend } from "resend";

// .env lives at the repo root, not in services/api.
config({ path: resolve(__dirname, "../../../.env") });

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY is not set. Add it to .env first.");
  process.exit(1);
}

async function main() {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "OctoFocusAI <onboarding@resend.dev>",
    to: process.env.RESEND_TEST_TO ?? "sunil28071987@gmail.com",
    subject: "Hello from OctoFocusAI",
    html: "<p>Congrats on sending your <strong>first email</strong> through Resend.</p>",
  });

  if (error) {
    console.error("Send failed:", error);
    process.exit(1);
  }
  console.log("Sent:", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
