import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { cn } from "@/lib/utils";

type ChatTypingBubbleProps = {
  name: string;
  profilePictureUrl?: string | null;
  label?: string;
  className?: string;
};

/** Incoming-message-shaped typing indicator; unmount when typing stops. */
export function ChatTypingBubble({
  name,
  profilePictureUrl,
  label = "typing...",
  className,
}: ChatTypingBubbleProps) {
  return (
    <div
      className={cn("mt-3 flex w-full items-end justify-start gap-2", className)}
      aria-live="polite"
      aria-label={`${name} ${label}`}
    >
      <UserProfileAvatar
        name={name}
        profilePictureUrl={profilePictureUrl || undefined}
        className="h-7 w-7 shrink-0 self-end lg:h-8 lg:w-8"
        fallbackClassName="bg-sky-100 text-[8px] font-semibold text-sky-700"
      />
      <div className="rounded-[1.15rem] rounded-bl-md bg-[#F4F4F5] px-3 py-1.5 text-sm leading-snug text-gray-500 shadow-none dark:bg-[#1e2732] dark:text-zinc-400">
        <span className="italic tracking-wide">{label}</span>
      </div>
    </div>
  );
}
