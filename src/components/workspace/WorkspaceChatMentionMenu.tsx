import { Users } from "lucide-react";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { cn } from "@/lib/utils";
import type { MentionMenuOption } from "@/lib/workspaceChatMentions";

type WorkspaceChatMentionMenuProps = {
  options: MentionMenuOption[];
  highlightIndex: number;
  everyoneLabel: string;
  onHighlight: (index: number) => void;
  onSelect: (option: MentionMenuOption) => void;
};

export function WorkspaceChatMentionMenu({
  options,
  highlightIndex,
  everyoneLabel,
  onHighlight,
  onSelect,
}: WorkspaceChatMentionMenuProps) {
  if (!options.length) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-52 overflow-y-auto rounded-xl border border-sky-200 bg-white py-1 shadow-lg"
      role="listbox"
      aria-label={everyoneLabel}
    >
      {options.map((option, index) => {
        const highlighted = index === highlightIndex;
        return (
          <button
            key={option.type === "all" ? "all" : option.userId}
            type="button"
            role="option"
            aria-selected={highlighted}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
              highlighted ? "bg-sky-50 text-sky-900" : "text-gray-800 hover:bg-sky-50/80",
            )}
            onMouseEnter={() => onHighlight(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(option);
            }}
          >
            {option.type === "all" ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Users size={14} />
              </span>
            ) : (
              <UserProfileAvatar
                name={option.name}
                profilePictureUrl={option.profilePictureUrl || undefined}
                className="h-7 w-7"
                fallbackClassName="bg-sky-100 text-[9px] font-semibold text-sky-700"
              />
            )}
            <span className="min-w-0 flex-1 truncate">
              {option.type === "all" ? (
                <>
                  <span className="font-semibold">@all</span>
                  <span className="ml-1.5 text-xs text-gray-500">{everyoneLabel}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">@{option.name}</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
