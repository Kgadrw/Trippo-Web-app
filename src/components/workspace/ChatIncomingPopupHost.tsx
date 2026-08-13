import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import {
  dismissChatIncomingPopup,
  subscribeChatIncomingPopups,
  type ChatIncomingPopupItem,
} from "@/lib/chatIncomingPopupStore";
import { cn } from "@/lib/utils";

function PopupAvatar({ name, iconUrl }: { name: string; iconUrl?: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 ring-2 ring-white">
      {initials}
    </div>
  );
}

function PopupCard({
  item,
  onOpen,
}: {
  item: ChatIncomingPopupItem;
  onOpen: (item: ChatIncomingPopupItem) => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto relative w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]",
        "animate-in fade-in duration-300 max-sm:slide-in-from-top-4 sm:slide-in-from-right-4",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-sky-50/70"
      >
        <PopupAvatar name={item.title} iconUrl={item.iconUrl} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">{item.body}</p>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-sky-600">
            New message · Tap to open
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => dismissChatIncomingPopup(item.id)}
        className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Incoming chat popups: top on mobile, bottom-right on desktop.
 */
export function ChatIncomingPopupHost() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChatIncomingPopupItem[]>([]);

  useEffect(() => subscribeChatIncomingPopups(setItems), []);

  if (!items.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[120] flex w-full max-w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2",
        "top-[max(0.75rem,env(safe-area-inset-top))] px-3",
        "sm:left-auto sm:right-6 sm:top-auto sm:bottom-6 sm:w-auto sm:max-w-none sm:translate-x-0 sm:flex-col-reverse sm:px-0",
      )}
    >
      {items.map((item) => (
        <div key={item.id} className="relative">
          <PopupCard
            item={item}
            onOpen={(popup) => {
              dismissChatIncomingPopup(popup.id);
              navigate(popup.href);
            }}
          />
        </div>
      ))}
    </div>
  );
}

