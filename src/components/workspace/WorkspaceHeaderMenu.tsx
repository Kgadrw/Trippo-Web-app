import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Plus,
  Settings2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { workspaceApi } from '@/lib/api';
import {
  WORKSPACE_PAGES,
  notifyWorkspaceMetaChanged,
  type WorkspacePageKey,
} from '@/lib/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WorkspaceInviteEmailInput } from './WorkspaceInviteEmailInput';

const workspacePermissionCheckboxClass =
  'border-2 border-sky-500 bg-white shadow-sm hover:border-sky-600 data-[state=checked]:bg-sky-400 data-[state=checked]:border-sky-500 data-[state=checked]:text-white focus-visible:ring-sky-400';

type WorkspaceMemberRow = {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  permissions: WorkspacePageKey[];
  name: string;
  email: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  permissions: WorkspacePageKey[];
};

const headerButtonClass =
  'flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900';

export function WorkspaceHeaderMenu({ className }: { className?: string }) {
  const {
    mode,
    activeWorkspace,
    workspaces,
    loading,
    switchToPersonal,
    switchToWorkspace,
    createWorkspace,
    isWorkspaceAdmin,
  } = useWorkspace();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const label = useMemo(() => {
    if (mode === 'workspace' && activeWorkspace) {
      return activeWorkspace.name;
    }
    return 'Personal';
  }, [mode, activeWorkspace]);

  const handleCreate = async () => {
    const name = workspaceName.trim();
    if (!name) {
      toast({ title: 'Workspace name required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await createWorkspace(name);
      setWorkspaceName('');
      setCreateOpen(false);
      toast({ title: 'Workspace created' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const isLoggedIn = !!localStorage.getItem('profit-pilot-user-id');

  if (!isLoggedIn) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(headerButtonClass, className)} aria-label="Workspace">
            <Building2 size={16} className="shrink-0 text-blue-600" />
            <span className="hidden max-w-[100px] truncate sm:inline">{label}</span>
            <ChevronDown size={14} className="shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          <DropdownMenuItem onClick={switchToPersonal} className="gap-2">
            <User size={14} />
            <span className="flex-1">Personal data</span>
            {mode === 'personal' ? <Check size={14} className="text-blue-600" /> : null}
          </DropdownMenuItem>
          {loading ? (
            <DropdownMenuItem disabled>
              <Loader2 size={14} className="animate-spin" />
              Loading workspaces…
            </DropdownMenuItem>
          ) : workspaces.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              No shared workspaces yet
            </DropdownMenuItem>
          ) : (
            workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} onClick={() => switchToWorkspace(ws)} className="gap-2">
                <Users size={14} />
                <span className="flex-1 truncate">{ws.name}</span>
                {mode === 'workspace' && activeWorkspace?.id === ws.id ? (
                  <Check size={14} className="text-blue-600" />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus size={14} />
            Create workspace
          </DropdownMenuItem>
          {mode === 'workspace' && activeWorkspace && isWorkspaceAdmin ? (
            <DropdownMenuItem onClick={() => setManageOpen(true)} className="gap-2">
              <Settings2 size={14} />
              Manage workspace
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Share products, sales, and other data with your team. Your personal data stays separate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Downtown Store"
              onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeWorkspace ? (
        <ManageWorkspaceDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          onChanged={() => notifyWorkspaceMetaChanged()}
        />
      ) : null}
    </>
  );
}

function ManageWorkspaceDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [invitePermissions, setInvitePermissions] = useState<WorkspacePageKey[]>([
    'dashboard',
    'products',
    'sales',
  ]);
  const [sending, setSending] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState(workspaceName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (open) setEditedName(workspaceName);
  }, [open, workspaceName]);

  const saveWorkspaceName = async () => {
    const name = editedName.trim();
    if (!name) {
      toast({ title: 'Workspace name required', variant: 'destructive' });
      return;
    }
    if (name === workspaceName) return;

    setSavingName(true);
    try {
      await workspaceApi.update(workspaceId, { name });
      toast({ title: 'Workspace name updated' });
      onChanged();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update workspace name';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await workspaceApi.getMembers(workspaceId);
      setMembers((response.members as WorkspaceMemberRow[]) || []);
      setInvites((response.invites as PendingInvite[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load members';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    if (open) void loadMembers();
  }, [open, loadMembers]);

  const toggleInvitePermission = (key: WorkspacePageKey) => {
    setInvitePermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const response = await workspaceApi.invite(workspaceId, {
        email,
        role: inviteRole,
        permissions: inviteRole === 'admin' ? undefined : invitePermissions,
      });
      setInviteEmail('');
      toast({
        title: 'Invitation sent',
        description: response?.hasAccount
          ? 'They will receive an email and an in-app notification.'
          : 'They will receive an email to create an account and join.',
      });
      await loadMembers();
      onChanged();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send invite';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await workspaceApi.removeMember(workspaceId, memberId);
      toast({ title: 'Member removed' });
      await loadMembers();
      onChanged();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      await workspaceApi.revokeInvite(workspaceId, inviteId);
      toast({ title: 'Invite revoked' });
      await loadMembers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to revoke invite';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const saveMemberPermissions = async (
    member: WorkspaceMemberRow,
    role: 'admin' | 'member',
    permissions: WorkspacePageKey[],
  ) => {
    try {
      await workspaceApi.updateMember(workspaceId, member.id, {
        role,
        permissions: role === 'admin' ? undefined : permissions,
      });
      toast({ title: 'Member updated' });
      setEditingMemberId(null);
      await loadMembers();
      onChanged();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update member';
      toast({ title: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage workspace</DialogTitle>
          <DialogDescription>
            Update workspace details, invite teammates, and control page access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-900">Workspace name</p>
            <div className="flex gap-2">
              <Input
                id="edit-workspace-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="e.g. Downtown Store"
                onKeyDown={(e) => e.key === 'Enter' && void saveWorkspaceName()}
                disabled={savingName}
              />
              <Button
                size="sm"
                onClick={() => void saveWorkspaceName()}
                disabled={savingName || editedName.trim() === workspaceName || !editedName.trim()}
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-900">Invite by email</p>
            <div className="flex gap-2">
              <WorkspaceInviteEmailInput
                workspaceId={workspaceId}
                value={inviteEmail}
                onChange={setInviteEmail}
                disabled={sending}
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteRole === 'member' ? (
              <div className="grid grid-cols-2 gap-2">
                {WORKSPACE_PAGES.map((page) => (
                  <label key={page.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={invitePermissions.includes(page.key)}
                      onCheckedChange={() => toggleInvitePermission(page.key)}
                      className={workspacePermissionCheckboxClass}
                    />
                    {page.label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Admins can access all pages.</p>
            )}
            <Button size="sm" onClick={() => void sendInvite()} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail size={14} />}
              Send invite
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Members</p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        <p className="mt-1 text-xs capitalize text-blue-600">{member.role}</p>
                      </div>
                      {member.role !== 'owner' ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingMemberId(editingMemberId === member.id ? null : member.id)
                            }
                          >
                            Access
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => void removeMember(member.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {editingMemberId === member.id && member.role !== 'owner' ? (
                      <MemberAccessEditor
                        member={member}
                        onSave={(role, permissions) =>
                          void saveMemberPermissions(member, role, permissions)
                        }
                        onCancel={() => setEditingMemberId(null)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {invites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Pending invites</p>
              <ul className="space-y-1">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded border border-dashed border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{inv.email}</span>
                    <Button size="sm" variant="ghost" onClick={() => void revokeInvite(inv.id)}>
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberAccessEditor({
  member,
  onSave,
  onCancel,
}: {
  member: WorkspaceMemberRow;
  onSave: (role: 'admin' | 'member', permissions: WorkspacePageKey[]) => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState<'admin' | 'member'>(member.role === 'admin' ? 'admin' : 'member');
  const [permissions, setPermissions] = useState<WorkspacePageKey[]>(member.permissions);

  const toggle = (key: WorkspacePageKey) => {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      {role === 'member' ? (
        <div className="grid grid-cols-2 gap-1">
          {WORKSPACE_PAGES.map((page) => (
            <label key={page.key} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={permissions.includes(page.key)}
                onCheckedChange={() => toggle(page.key)}
                className={workspacePermissionCheckboxClass}
              />
              {page.label}
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(role, permissions)}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
