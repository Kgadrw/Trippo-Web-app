import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white lg:h-14 lg:w-14"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 ring-2 ring-white lg:h-14 lg:w-14 lg:text-base">
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
        "pointer-events-auto relative w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.1)]",
        "lg:w-[28rem]",
        "animate-in fade-in duration-300 max-lg:slide-in-from-top-4",
        "lg:slide-in-from-bottom-5 lg:slide-in-from-right-5",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-start gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-sky-50/70 lg:gap-4 lg:px-5 lg:py-4"
      >
        <PopupAvatar name={item.title} iconUrl={item.iconUrl} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[15px] font-semibold text-gray-900 lg:text-base">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600 lg:line-clamp-3 lg:text-[15px]">
            {item.body}
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-sky-600">
            New message · Click to open
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => dismissChatIncomingPopup(item.id)}
        className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Incoming chat popups: top on mobile, bottom-right push on desktop.
 * Portaled to document.body so Messages overflow:hidden never clips them.
 */
export function ChatIncomingPopupHost() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChatIncomingPopupItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => subscribeChatIncomingPopups(setItems), []);
  useEffect(() => setMounted(true), []);

  if (!mounted || !items.length) return null;

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed z-[300] flex flex-col gap-2.5",
        // Mobile: top center
        "left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] w-full max-w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 px-3",
        // Desktop: bottom-right, slightly inset
        "lg:left-auto lg:right-8 lg:top-auto lg:bottom-8 lg:w-auto lg:max-w-none lg:translate-x-0 lg:flex-col-reverse lg:px-0",
      )}
      role="region"
      aria-label="Incoming messages"
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
    </div>,
    document.body,
  );
}
