/**
 * Notion-style share popover.
 *
 * Two tabs:
 *   - Share   → invite people by email, manage workspace member access,
 *               create share links (with optional password + expiry)
 *   - Publish → flip the resource to public/unlisted/workspace/private,
 *               copy the resulting /p/<workspace-slug>/<slug> URL
 *
 * Live (always-on); every save propagates because the public route fetches
 * from the same DB through a 60s edge-cached endpoint.
 */
"use client";

import { Check, Copy, Globe, Link2, Loader2, Lock, RefreshCcw, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createShareApi,
  createShareLinkApi,
  listShareLinksApi,
  listSharesApi,
  publishResourceApi,
  resendInviteApi,
  revokeShareApi,
  revokeShareLinkApi,
} from "../api/shares-api";
import { PERMISSION_LABEL, VISIBILITY_LABEL } from "../constants";
import type {
  PublishedResource,
  ResourceKind,
  ResourceShare,
  SharePermission,
  ShareLink,
  Visibility,
} from "../types";

export interface SharePopoverProps {
  resourceKind: ResourceKind;
  resourceId: string;
  resourceTitle: string;
  initialVisibility: Visibility;
  initialPublicSlug: string | null;
  workspaceSlug: string;
}

export function SharePopover(props: SharePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Share2 className="size-3.5" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <SharePopoverBody {...props} />
      </PopoverContent>
    </Popover>
  );
}

function SharePopoverBody(props: SharePopoverProps) {
  return (
    <Tabs defaultValue="share" className="w-full">
      <TabsList className="bg-transparent w-full justify-start gap-2 border-b px-3 pt-2">
        <TabsTrigger value="share" className="data-[state=active]:bg-accent">
          <Share2 className="size-3.5" />
          Share
        </TabsTrigger>
        <TabsTrigger value="publish" className="data-[state=active]:bg-accent">
          <Globe className="size-3.5" />
          Publish
        </TabsTrigger>
      </TabsList>
      <TabsContent value="share" className="m-0 p-4">
        <ShareTab {...props} />
      </TabsContent>
      <TabsContent value="publish" className="m-0 p-4">
        <PublishTab {...props} />
      </TabsContent>
    </Tabs>
  );
}

// =============================================================================
// SHARE TAB
// =============================================================================

function ShareTab({ resourceKind, resourceId }: SharePopoverProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("viewer");
  const [busy, setBusy] = useState(false);
  const [shares, setShares] = useState<ResourceShare[] | null>(null);
  const [links, setLinks] = useState<ShareLink[] | null>(null);

  const load = async () => {
    const [s, l] = await Promise.all([
      listSharesApi(resourceKind, resourceId),
      listShareLinksApi(resourceKind, resourceId),
    ]);
    setShares(s);
    setLinks(l);
  };

  // Lazy-load on first render.
  if (shares === null && !busy) {
    void load();
  }

  const handleInvite = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await createShareApi({ resourceKind, resourceId, grantedToEmail: email, permission });
      setEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email or workspace member"
          className="h-8 flex-1 text-xs"
        />
        <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["viewer", "commenter", "editor", "admin"] as const).map((p) => (
              <SelectItem key={p} value={p}>
                {PERMISSION_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleInvite} disabled={busy || !email}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Invite"}
        </Button>
      </div>

      {shares && shares.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
            People
          </div>
          {shares.map((s) => (
            <ShareRow key={s.id} share={s} onChange={load} />
          ))}
        </div>
      ) : null}

      <ShareLinksSection
        resourceKind={resourceKind}
        resourceId={resourceId}
        links={links}
        onChange={load}
      />
    </div>
  );
}

function ShareRow({ share, onChange }: { share: ResourceShare; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const label = share.grantedToEmail ?? share.grantedToUserId ?? "—";

  return (
    <div className="hover:bg-accent/40 -mx-1 flex items-center justify-between rounded px-1.5 py-1 text-xs">
      <div className="flex items-center gap-2 truncate">
        <span className="truncate">{label}</span>
        {share.status === "pending" ? (
          <span className="text-muted-foreground rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px]">
            Pending
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{PERMISSION_LABEL[share.permission]}</span>
        {share.status === "pending" ? (
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await resendInviteApi(share.id);
              } finally {
                setBusy(false);
              }
            }}
            aria-label="Resend invite"
            title="Resend invite"
          >
            <RefreshCcw className="size-3" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await revokeShareApi(share.id);
              onChange();
            } finally {
              setBusy(false);
            }
          }}
          aria-label="Revoke"
          title="Revoke"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function ShareLinksSection({
  resourceKind,
  resourceId,
  links,
  onChange,
}: {
  resourceKind: ResourceKind;
  resourceId: string;
  links: ShareLink[] | null;
  onChange: () => void;
}) {
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [permission, setPermission] = useState<SharePermission>("viewer");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await createShareLinkApi({
        resourceKind,
        resourceId,
        permission,
        password: usePassword && password ? password : undefined,
      });
      setPassword("");
      setUsePassword(false);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        Share links
      </div>
      <div className="flex items-center gap-2">
        <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["viewer", "commenter", "editor"] as const).map((p) => (
              <SelectItem key={p} value={p}>
                {PERMISSION_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Switch checked={usePassword} onCheckedChange={setUsePassword} />
          <Lock className="size-3" />
          Password
        </label>
        <Button size="sm" disabled={busy} onClick={handleCreate} className="ml-auto">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Create"}
        </Button>
      </div>
      {usePassword ? (
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (set at creation only)"
          className="h-8 text-xs"
        />
      ) : null}
      {links && links.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          {links.map((link) => (
            <LinkRow key={link.id} link={link} onChange={onChange} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LinkRow({ link, onChange }: { link: ShareLink; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-accent/30 flex items-center gap-1.5 rounded px-2 py-1 text-xs">
      <Link2 className="size-3 shrink-0" />
      <code className="text-muted-foreground truncate text-[11px]">{link.url}</code>
      <span className="text-muted-foreground ml-auto shrink-0">
        {PERMISSION_LABEL[link.permission]}
      </span>
      {link.hasPassword ? <Lock className="size-3" /> : null}
      <Button variant="ghost" size="sm" className="size-6 p-0" onClick={handleCopy}>
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await revokeShareLinkApi(link.id);
            onChange();
          } finally {
            setBusy(false);
          }
        }}
        aria-label="Revoke link"
        title="Revoke link"
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

// =============================================================================
// PUBLISH TAB
// =============================================================================

function PublishTab(props: SharePopoverProps) {
  const [visibility, setVisibility] = useState<Visibility>(props.initialVisibility);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<PublishedResource | null>(
    props.initialPublicSlug
      ? {
          resourceKind: props.resourceKind,
          resourceId: props.resourceId,
          publicSlug: props.initialPublicSlug,
          visibility: props.initialVisibility,
          publishedAt: null,
          lastPublishedAt: null,
          workspaceSlug: props.workspaceSlug,
          publicUrl: `/p/${props.workspaceSlug}/${props.initialPublicSlug}`,
        }
      : null,
  );

  const handleApply = async (next: Visibility) => {
    setBusy(true);
    try {
      const result = await publishResourceApi(props.resourceKind, props.resourceId, next);
      setPublished(result);
      setVisibility(next);
    } finally {
      setBusy(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const copyUrl = async () => {
    if (!published) return;
    const full = `${window.location.origin}${published.publicUrl}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-foreground mb-1 text-sm font-medium">
          Publish &ldquo;{props.resourceTitle}&rdquo;
        </div>
        <p className="text-muted-foreground text-xs">
          Changes propagate live. Anyone with the link sees the latest save (60s edge cache).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["private", "workspace", "unlisted", "public"] as const).map((v) => (
              <SelectItem key={v} value={v}>
                {VISIBILITY_LABEL[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={busy || visibility === props.initialVisibility}
          onClick={() => handleApply(visibility)}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>

      {published && published.visibility !== "private" ? (
        <div className="bg-accent/30 flex items-center gap-1.5 rounded px-2 py-1.5 text-xs">
          <Globe className="size-3" />
          <code className="text-muted-foreground truncate text-[11px]">{published.publicUrl}</code>
          <Button variant="ghost" size="sm" className="ml-auto size-6 p-0" onClick={copyUrl}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
