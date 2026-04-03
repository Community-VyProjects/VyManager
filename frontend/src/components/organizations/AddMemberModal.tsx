"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertCircle,
  Search,
  Check,
  UserPlus,
  Users,
  Link2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { userManagementService, UserListItem } from "@/lib/api/user-management";
import { orgService } from "@/lib/api/org";
import { ApiError } from "@/lib/types/api";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  existingMemberIds: string[];
  onSuccess: () => void;
}

type ModalTab = "existing" | "invite";

export function AddMemberModal({
  open,
  onOpenChange,
  orgId,
  orgName,
  existingMemberIds,
  onSuccess,
}: AddMemberModalProps) {
  const [tab, setTab] = useState<ModalTab>("invite");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing user tab
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState("MEMBER");

  // Invite tab
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteSiteRole, setInviteSiteRole] = useState("VIEWER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("invite");
      setSelectedUserId(null);
      setRole("MEMBER");
      setSearchQuery("");
      setError(null);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("MEMBER");
      setInviteSiteRole("VIEWER");
      setInviteLink(null);
      setLinkCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && tab === "existing") {
      loadUsers();
    }
  }, [open, tab]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await userManagementService.listUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleAddExisting = async () => {
    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await orgService.addOrgMember(orgId, selectedUserId, role);
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndInvite = async () => {
    if (!inviteEmail.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // 1. Create user with invite link
      const res = await fetch("/api/internal/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      // 2. Set site role via backend
      try {
        await userManagementService.updateUser(data.user.id, {
          site_role: inviteSiteRole as any,
        });
      } catch {
        // Non-critical - user is created, role can be changed later
      }

      // 3. Add to org
      try {
        await orgService.addOrgMember(orgId, data.user.id, inviteRole);
      } catch {
        // Non-critical if they got auto-added
      }

      // 4. Show invite link
      setInviteLink(data.invite_url);
      onSuccess();
    } catch (err) {
      setError((err as Error).message || "Failed to create and invite user");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const availableUsers = users.filter((u) => {
    if (existingMemberIds.includes(u.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a user to <span className="font-medium">{orgName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => { setTab("invite"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "invite"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create & Invite
          </button>
          <button
            onClick={() => { setTab("existing"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "existing"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Existing User
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Invite Tab */}
        {tab === "invite" && (
          <div className="space-y-4">
            {inviteLink ? (
              /* Success - show invite link */
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <div className="text-center">
                    <h3 className="font-semibold text-foreground">User Created</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share this link so they can set their password
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={handleCopyLink}
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This link expires in 7 days and can only be used once.
                  </p>
                </div>

                <DialogFooter>
                  <Button onClick={handleClose} className="w-full">Done</Button>
                </DialogFooter>
              </div>
            ) : (
              /* Create form */
              <>
                <div className="space-y-2">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Name <span className="text-muted-foreground text-xs">(Optional)</span>
                  </Label>
                  <Input
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Site Role</Label>
                    <Select value={inviteSiteRole} onValueChange={setInviteSiteRole} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                        <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                        <SelectItem value="PROJECT_ADMIN">Project Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Org Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="OWNER">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAndInvite} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Create & Get Link
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {/* Existing User Tab */}
        {tab === "existing" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[200px] border border-border rounded-lg">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? "No matching users found" : "All users are already members"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors ${
                        selectedUserId === user.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {selectedUserId === user.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="space-y-2">
              <Label>Organization Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleAddExisting} disabled={loading || !selectedUserId}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
