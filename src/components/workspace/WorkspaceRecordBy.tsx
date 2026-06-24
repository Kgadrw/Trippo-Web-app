import { useWorkspace } from '@/hooks/useWorkspace';

type WorkspaceRecordByProps = {
  name?: string | null;
  className?: string;
};

export function WorkspaceRecordBy({ name, className }: WorkspaceRecordByProps) {
  const { mode } = useWorkspace();
  if (mode !== 'workspace' || !name) return null;

  return (
    <span className={className ?? 'block text-xs font-normal text-gray-500'}>
      {name}
    </span>
  );
}
