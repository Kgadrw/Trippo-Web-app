import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { workspaceApi } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSubdomain, getSubdomainUrl } from '@/hooks/useSubdomain';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const response = await workspaceApi.acceptInvite(token);
      const workspace = response.workspace as { id: string; name: string; role: string; permissions: string[] };
      await refreshWorkspaces();
      if (workspace) {
        switchToWorkspace({
          id: String(workspace.id),
          name: workspace.name,
          role: workspace.role as 'owner' | 'admin' | 'member',
          permissions: workspace.permissions as never[],
        });
      }
      toast({ title: `Joined ${workspaceName}` });
      if (subdomain === 'bookfy') {
        navigate('/');
      } else {
        window.location.href = getSubdomainUrl('bookfy', '/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <Building2 className="h-12 w-12 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">Join {workspaceName}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sign in with <strong>{invitedEmail}</strong> to accept this workspace invitation.
        </p>
        <Button onClick={() => navigate(`/?login=1&invite=${token}`)}>Sign in to accept</Button>
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
      <Button onClick={() => void handleAccept()} disabled={accepting}>
        {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept invitation'}
      </Button>
    </div>
  );
}
