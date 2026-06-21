"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import {
  deleteWorkspaceAction,
  inviteMemberAction,
  removeMemberAction,
  renameWorkspaceAction,
  updateMemberRoleAction,
} from "@/actions/workspaces-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = "OWNER" | "ADMIN" | "MEMBER";

interface MemberRow {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface SettingsPanelProps {
  workspaceId: string;
  initialName: string;
  initialSlug: string;
  viewerRole: Role;
  members: MemberRow[];
}

export function SettingsPanel({
  workspaceId,
  initialName,
  initialSlug,
  viewerRole,
  members: initialMembers,
}: SettingsPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canManage = viewerRole === "OWNER" || viewerRole === "ADMIN";
  const isOwner = viewerRole === "OWNER";

  const handleRename = async () => {
    if (!name.trim() || name === initialName) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await renameWorkspaceAction(workspaceId, name.trim());
      router.refresh();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed.");
    } finally {
      setRenaming(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError(null);
    try {
      const m = await inviteMemberAction(workspaceId, inviteEmail.trim(), inviteRole);
      setMembers((prev) => [
        ...prev,
        {
          id: m.id,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: m.user ?? { id: m.userId, name: m.userId, email: inviteEmail, avatarUrl: null },
        },
      ]);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await updateMemberRoleAction(workspaceId, userId, role);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Role update failed.");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      await removeMemberAction(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Remove failed.");
    }
  };

  const handleDelete = async () => {
    if (confirmName !== initialName) return;
    setDeleting(true);
    try {
      await deleteWorkspaceAction(workspaceId);
      router.push("/app");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Workspace details and members.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>The workspace's name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              disabled={!canManage || renaming}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Slug</Label>
            <div className="text-muted-foreground text-xs">
              <code>octofocus.ai/p/{initialSlug}/...</code>
            </div>
          </div>
          {renameError ? <p className="text-destructive text-xs">{renameError}</p> : null}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleRename}
            disabled={!canManage || renaming || !name.trim() || name === initialName}
          >
            {renaming ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Add teammates by email. They must already have an OctoFocusAI account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canManage ? (
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  {isOwner ? <SelectItem value="OWNER">Owner</SelectItem> : null}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={inviting || !inviteEmail}>
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Invite
              </Button>
            </form>
          ) : null}
          {inviteError ? <p className="text-destructive text-xs">{inviteError}</p> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-7">
                        <AvatarImage src={m.user.avatarUrl ?? undefined} alt={m.user.name} />
                        <AvatarFallback>{m.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="grid">
                        <span className="text-sm font-medium">{m.user.name}</span>
                        <span className="text-muted-foreground text-xs">{m.user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && (isOwner || m.role !== "OWNER") ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m.userId, v as Role)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          {isOwner ? <SelectItem value="OWNER">Owner</SelectItem> : null}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-xs uppercase tracking-wider">
                        {m.role.toLowerCase()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage && (isOwner || m.role !== "OWNER") ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => handleRemove(m.userId)}
                        aria-label="Remove member"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Deleting the workspace removes all its projects, notes, canvases, and shares. This
              cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete workspace
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setConfirmName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{initialName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This will permanently delete the workspace and all its contents. Type the workspace
              name to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={initialName}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            disabled={deleting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmName !== initialName}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
