import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { workspaceApi } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSubdomain, getSubdomainUrl } from '@/hooks/useSubdomain';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { WorkspaceSummary } from '@/lib/workspace';

export default function WorkspaceInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const subdomain = useSubdomain();
  const { toast } = useToast();
  const { refreshWorkspaces, switchToWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [error, setError] = useState('');
  const autoAcceptStartedRef = useRef(false);

  const isAuthenticated = localStorage.getItem('profit-pilot-authenticated') === 'true';

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    workspaceApi
      .previewInvite(token)
      .then((response) => {
        const invite = response.invite as { workspaceName?: string; email?: string };
        setWorkspaceName(invite?.workspaceName || 'Workspace');
        setInvitedEmail(invite?.email || '');
      })
      .catch(() => setError('This invitation is invalid or has expired'))
      .finally(() => setLoading(false));
  }, [token]);

  const joinAndEnterWorkspace = useCallback(
    async (workspaceLike: {
      id?: string;
      name?: string;
      role?: string;
      permissions?: string[];
    }) => {
      const id = String(workspaceLike.id || '');
      if (!id) {
        throw new Error('Workspace id missing after accepting invitation');
      }

      await refreshWorkspaces({ force: true });

      const summary: WorkspaceSummary = {
        id,
        name: workspaceLike.name || workspaceName || 'Workspace',
        role: (workspaceLike.role === 'owner' || workspaceLike.role === 'admin'
          ? workspaceLike.role
          : 'member') as WorkspaceSummary['role'],
        permissions: (workspaceLike.permissions || []) as WorkspaceSummary['permissions'],
      };

      switchToWorkspace(summary);
      toast({ title: `Joined ${summary.name}` });

      if (subdomain === 'bookfy') {
        navigate('/');
      } else {
        window.location.href = getSubdomainUrl('bookfy', '/');
      }
    },
    [navigate, refreshWorkspaces, subdomain, switchToWorkspace, toast, workspaceName],
  );

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const response = await workspaceApi.acceptInvite(token);
      const workspace = response.workspace as
        | { id: string; name: string; role: string; permissions: string[] }
        | undefined;
      const workspaceId =
        workspace?.id ||
        (typeof (response as { workspaceId?: string }).workspaceId === 'string'
          ? (response as { workspaceId: string }).workspaceId
          : '');

      await joinAndEnterWorkspace({
        id: workspace?.id || workspaceId,
        name: workspace?.name,
        role: workspace?.role,
        permissions: workspace?.permissions,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      toast({ title: message, variant: 'destructive' });
      autoAcceptStartedRef.current = false;
    } finally {
      setAccepting(false);
    }
  }, [joinAndEnterWorkspace, toast, token]);

  // Logged-in users landing from a notification/link: accept and enter automatically.
  useEffect(() => {
    if (loading || error || !isAuthenticated || !token || accepting) return;
    if (autoAcceptStartedRef.current) return;
    autoAcceptStartedRef.current = true;
    void handleAccept();
  }, [loading, error, isAuthenticated, token, accepting, handleAccept]);

  if (loading || (isAuthenticated && !error && accepting)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">
          {accepting ? `Joining ${workspaceName || 'workspace'}…` : 'Loading invitation…'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <Building2 className="h-12 w-12 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900">Invitation unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    const invitePath = `/workspace/invite/${token}`;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <Building2 className="h-12 w-12 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">Join {workspaceName}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sign in with <strong>{invitedEmail}</strong> to accept this workspace invitation.
        </p>
        <Button
          onClick={() =>
            navigate('/login', { state: { from: invitePath } })
          }
        >
          Sign in to accept
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <Building2 className="h-12 w-12 text-blue-600" />
      <h1 className="text-xl font-semibold text-gray-900">Join {workspaceName}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        You were invited to collaborate in this shared workspace. Your personal data stays separate.
      </p>
      <Button onClick={() => void handleAccept()} disabled={accepting} className="rounded-xl">
        {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept invitation'}
      </Button>
    </div>
  );
}
