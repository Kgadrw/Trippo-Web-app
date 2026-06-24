import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { pathToWorkspacePage, WORKSPACE_PAGES } from '@/lib/workspace';

type WorkspacePageGuardProps = {
  children: React.ReactNode;
};

export function WorkspacePageGuard({ children }: WorkspacePageGuardProps) {
  const location = useLocation();
  const { mode, canAccessPage } = useWorkspace();

  if (mode !== 'workspace') {
    return <>{children}</>;
  }

  const pageKey = pathToWorkspacePage(location.pathname);
  if (!pageKey) {
    return <>{children}</>;
  }

  if (!canAccessPage(pageKey)) {
    const fallback = WORKSPACE_PAGES.find((page) => canAccessPage(page.key));
    return <Navigate to={fallback?.path ?? '/products'} replace />;
  }

  return <>{children}</>;
}
