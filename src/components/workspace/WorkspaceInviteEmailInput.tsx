import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { workspaceApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { UserProfileAvatar } from '@/components/profile/UserProfileAvatar';
import { cn } from '@/lib/utils';

export type InviteUserSuggestion = {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
  alreadyMember: boolean;
};

type WorkspaceInviteEmailInputProps = {
  workspaceId: string;
  value: string;
  onChange: (email: string) => void;
  disabled?: boolean;
  className?: string;
};

export function WorkspaceInviteEmailInput({
  workspaceId,
  value,
  onChange,
  disabled,
  className,
}: WorkspaceInviteEmailInputProps) {
  const [suggestions, setSuggestions] = useState<InviteUserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setSearching(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setSearching(true);
      try {
        const response = await workspaceApi.searchInviteUsers(workspaceId, trimmed);
        if (requestId !== requestIdRef.current) return;
        setSuggestions((response.users as InviteUserSuggestion[]) || []);
        setHighlightIndex(-1);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void runSearch(value);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value, open, runSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectableSuggestions = suggestions.filter((user) => !user.alreadyMember);

  const selectUser = (user: InviteUserSuggestion) => {
    if (user.alreadyMember) return;
    onChange(user.email);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || selectableSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % selectableSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? selectableSuggestions.length - 1 : prev - 1,
      );
    } else if (event.key === 'Enter' && highlightIndex >= 0) {
      event.preventDefault();
      selectUser(selectableSuggestions[highlightIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn('relative min-w-0 flex-1', className)}>
      <div className="relative">
        <Input
          type="email"
          placeholder="Search by email or name…"
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {searching ? (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.length === 0 && !searching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No accounts found — you can still invite this email.
            </p>
          ) : null}

          {suggestions.map((user) => {
            const selectableIndex = selectableSuggestions.findIndex((s) => s.id === user.id);
            const isHighlighted = selectableIndex >= 0 && selectableIndex === highlightIndex;

            return (
              <button
                key={user.id}
                type="button"
                disabled={user.alreadyMember}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(user)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  user.alreadyMember
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-gray-50',
                  isHighlighted && 'bg-gray-50',
                )}
              >
                <UserProfileAvatar
                  name={user.name}
                  profilePictureUrl={user.profilePictureUrl || undefined}
                  className="h-8 w-8"
                  fallbackClassName="text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                {user.alreadyMember ? (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    In workspace
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <UserCheck className="h-3 w-3" aria-hidden />
                    Has account
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
