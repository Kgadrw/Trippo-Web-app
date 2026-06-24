import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  WORKSPACE_ACTIVITY_EVENT,
  type WorkspaceActivityDetail,
} from '@/lib/workspaceRealtime';

export function WorkspaceActivityListener() {
  const { toast } = useToast();
  const { mode } = useWorkspace();

  useEffect(() => {
    if (mode !== 'workspace') return;

    const onActivity = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceActivityDetail>).detail;
      if (!detail?.actorName) return;

      const resourceLabel =
        detail.resource === 'product'
          ? 'product'
          : detail.resource === 'sale'
            ? 'sale'
            : 'record';

      const actionLabel =
        detail.action === 'created'
          ? 'added'
          : detail.action === 'updated'
            ? 'updated'
            : 'removed';

      toast({
        title: 'Workspace update',
        description: `${detail.actorName} ${actionLabel} a ${resourceLabel}${detail.label ? `: ${detail.label}` : ''}`,
      });
    };

    window.addEventListener(WORKSPACE_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(WORKSPACE_ACTIVITY_EVENT, onActivity);
  }, [mode, toast]);

  return null;
}
