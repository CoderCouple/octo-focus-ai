/**
 * Transactional email — invite emails for the share/accept flow.
 *
 * Provider: Resend (RESEND_API_KEY). Without the key, falls back to logging
 * the email payload so local dev stays unblocked without DNS setup.
 *
 * For the very first smoke test, you can leave the domain unverified and
 * send via Resend's universal test sender `onboarding@resend.dev` — the
 * recipient must be the email tied to your Resend account in that case.
 * Once you've verified octofocus.ai, set RESEND_FROM to a noreply address
 * on the verified domain.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import type { ResourceKind } from "@octofocus/shared";

export interface InviteEmailInput {
  to: string;
  inviter: string;
  resourceKind: ResourceKind;
  resourceId: string;
  shareId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async sendInvite(input: InviteEmailInput): Promise<void> {
    const from = process.env.RESEND_FROM ?? "OctoFocusAI <onboarding@resend.dev>";
    const appUrl = process.env.PUBLIC_APP_URL ?? "https://www.octofocus.ai";
    const acceptUrl = `${appUrl}/invite/${input.shareId}`;

    const subject = `${input.inviter} shared a ${input.resourceKind} with you`;
    const html = renderInvite({
      inviter: input.inviter,
      resourceKind: input.resourceKind,
      acceptUrl,
    });
    const text = `${input.inviter} invited you to a ${input.resourceKind} on OctoFocusAI. Accept: ${acceptUrl}`;

    if (!this.client) {
      this.logger.warn(
        `RESEND_API_KEY missing — dropping invite to ${input.to} (${input.shareId}).`,
      );
      this.logger.log({ to: input.to, subject, acceptUrl });
      return;
    }

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    });
    if (error) {
      this.logger.error(`Resend failed: ${error.name} — ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /** Bare-bones sender for one-off smoke tests. */
  async sendRaw(args: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.client) throw new Error("RESEND_API_KEY not set.");
    const from = process.env.RESEND_FROM ?? "OctoFocusAI <onboarding@resend.dev>";
    const { error } = await this.client.emails.send({ from, ...args });
    if (error) throw new Error(`Email delivery failed: ${error.message}`);
  }
}

function renderInvite(args: { inviter: string; resourceKind: ResourceKind; acceptUrl: string }) {
  return `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;color:#e7e7e7;font-family:ui-sans-serif,system-ui;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#111;border:1px solid #222;border-radius:16px;padding:32px">
    <div style="font-size:14px;color:#888;margin-bottom:24px">OctoFocusAI</div>
    <h1 style="font-size:22px;margin:0 0 12px;color:#fafafa">You've been invited</h1>
    <p style="font-size:15px;line-height:1.55;color:#bbb">
      <strong style="color:#fafafa">${escapeHtml(args.inviter)}</strong> shared a ${args.resourceKind} with you.
    </p>
    <a href="${args.acceptUrl}" style="display:inline-block;margin-top:20px;padding:12px 18px;background:#fafafa;color:#0a0a0a;border-radius:10px;font-weight:600;text-decoration:none">Accept invite</a>
    <p style="font-size:12px;color:#666;margin-top:32px">If you didn't expect this, you can safely ignore the email.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
