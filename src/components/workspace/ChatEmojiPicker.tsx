import { useEffect, useState, type CSSProperties } from "react";
import { Smile } from "lucide-react";
import EmojiPicker, { type EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function insertEmojiInText(
  value: string,
  emoji: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  return {
    next: `${value.slice(0, start)}${emoji}${value.slice(end)}`,
    caret: start + emoji.length,
  };
}

type ChatEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
};

const EMOJI_PICKER_OVERRIDES = `
  .trippo-emoji-picker.EmojiPickerReact {
    --epr-search-input-border-radius: 9999px !important;
    --epr-search-input-height: 40px;
    --epr-skin-tone-size: 28px !important;
  }
  .trippo-emoji-picker .epr-search-container input,
  .trippo-emoji-picker input[aria-label="Type to search for an emoji"],
  aside.trippo-emoji-picker input[type="text"] {
    border-radius: 9999px !important;
    -webkit-border-radius: 9999px !important;
  }
  /* Skin tone (color) picker: match search bar size, pill shape, no extra borders */
  .trippo-emoji-picker .epr-skin-tones {
    --epr-skin-tone-size: 28px !important;
    padding: 0 !important;
    align-self: center !important;
    margin-left: 10px !important;
  }
  .trippo-emoji-picker .epr-skin-tones.epr-vertical {
    border-radius: 9999px !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .trippo-emoji-picker .epr-skin-tone-select {
    width: 28px !important;
    height: 28px !important;
  }
  .trippo-emoji-picker .epr-tone {
    width: 28px !important;
    height: 28px !important;
    border-radius: 9999px !important;
    border: none !important;
    box-shadow: none !important;
  }
  .trippo-emoji-picker .epr-tone:hover,
  .trippo-emoji-picker .epr-tone:focus,
  .trippo-emoji-picker .epr-tone.epr-active,
  .trippo-emoji-picker .epr-skin-tones .epr-active,
  .trippo-emoji-picker .epr-skin-tones.open .epr-active {
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }
  /* Active category: color only, no circular/extra borders */
  .trippo-emoji-picker .epr-cat-btn:focus::before,
  .trippo-emoji-picker .epr-cat-btn:focus-visible::before,
  .trippo-emoji-picker .epr-cat-btn.epr-active::before,
  .trippo-emoji-picker .epr-cat-btn::before {
    content: none !important;
    border: none !important;
    display: none !important;
  }
  .trippo-emoji-picker .epr-cat-btn:focus,
  .trippo-emoji-picker .epr-cat-btn:focus-visible,
  .trippo-emoji-picker .epr-cat-btn.epr-active {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
  }
`;

function roundEmojiSearchInput(root: ParentNode | null) {
  if (!root) return;
  const input = root.querySelector(
    '.epr-search-container input, input[aria-label="Type to search for an emoji"]',
  ) as HTMLInputElement | null;
  if (!input) return;
  input.style.setProperty("border-radius", "9999px", "important");
  input.classList.add("epr-search");
}

const SKIN_TONE_SIZE = 28;
const LIB_SKIN_TONE_SIZE = 28;

function syncSkinTonePickerSize(root: ParentNode | null) {
  if (!root) return;
  const skinTones = root.querySelector(".epr-skin-tones") as HTMLElement | null;
  if (skinTones) {
    skinTones.style.setProperty("--epr-skin-tone-size", `${SKIN_TONE_SIZE}px`, "important");
    skinTones.style.setProperty("padding", "0", "important");
    skinTones.style.setProperty("border", "none", "important");
    skinTones.style.setProperty("box-shadow", "none", "important");
    skinTones.style.setProperty("height", `${SKIN_TONE_SIZE}px`, "important");
    const basis = skinTones.style.flexBasis;
    if (basis?.endsWith("px")) {
      const px = Number.parseFloat(basis);
      if (Number.isFinite(px) && px > 0) {
        const steps = Math.round(px / LIB_SKIN_TONE_SIZE);
        skinTones.style.flexBasis = `${steps * SKIN_TONE_SIZE}px`;
        if (skinTones.style.height && skinTones.className.includes("epr-vertical")) {
          skinTones.style.height = `${steps * SKIN_TONE_SIZE}px`;
        } else {
          skinTones.style.height = `${SKIN_TONE_SIZE}px`;
        }
      }
    } else {
      skinTones.style.flexBasis = `${SKIN_TONE_SIZE}px`;
    }
  }

  root.querySelectorAll(".epr-tone").forEach((node) => {
    const tone = node as HTMLElement;
    tone.style.setProperty("width", `${SKIN_TONE_SIZE}px`, "important");
    tone.style.setProperty("height", `${SKIN_TONE_SIZE}px`, "important");
    tone.style.setProperty("border-radius", "9999px", "important");
    tone.style.setProperty("border", "none", "important");
    tone.style.setProperty("box-shadow", "none", "important");
    tone.style.setProperty("outline", "none", "important");

    let transform = tone.style.transform || "";
    transform = transform.replace(/scale\(\s*1\.3\s*\)/g, "scale(1)");
    transform = transform.replace(/translateX\(-(\d+(?:\.\d+)?)px\)/g, (_, px: string) => {
      const value = Number(px);
      if (!value) return "translateX(0px)";
      const steps = Math.round(value / LIB_SKIN_TONE_SIZE);
      return `translateX(-${steps * SKIN_TONE_SIZE}px)`;
    });
    transform = transform.replace(/translateY\(-(\d+(?:\.\d+)?)px\)/g, (_, px: string) => {
      const value = Number(px);
      if (!value) return "translateY(0px)";
      const steps = Math.round(value / LIB_SKIN_TONE_SIZE);
      return `translateY(-${steps * SKIN_TONE_SIZE}px)`;
    });
    if (transform) tone.style.transform = transform;
  });

  const select = root.querySelector(".epr-skin-tone-select") as HTMLElement | null;
  if (select) {
    select.style.setProperty("width", `${SKIN_TONE_SIZE}px`, "important");
    select.style.setProperty("height", `${SKIN_TONE_SIZE}px`, "important");
  }
}

function polishEmojiPicker(root: ParentNode | null) {
  roundEmojiSearchInput(root);
  syncSkinTonePickerSize(root);
}

export function ChatEmojiPicker({
  onSelect,
  label = "Emoji",
  className,
  buttonClassName,
}: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const root = () => document.querySelector(".trippo-emoji-picker");
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => polishEmojiPicker(root()));
    };
    run();
    const t1 = window.setTimeout(run, 0);
    const t2 = window.setTimeout(run, 50);
    const observer = new MutationObserver(run);
    const el = root();
    if (el) {
      observer.observe(el, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    // Re-sync when skin-tone fan opens/closes (transform changes via click)
    const onClick = () => window.setTimeout(run, 0);
    el?.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(frame);
      observer.disconnect();
      el?.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-sky-100 hover:text-sky-700 active:bg-sky-100 lg:h-9 lg:w-9",
            buttonClassName,
          )}
          aria-label={label}
          title={label}
        >
          <Smile size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        className={cn(
          "z-[130] w-auto border-0 bg-transparent p-0 shadow-none",
          className,
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <style>{EMOJI_PICKER_OVERRIDES}</style>
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={Theme.LIGHT}
          emojiStyle={EmojiStyle.APPLE}
          className="trippo-emoji-picker"
          style={
            {
              ["--epr-search-input-border-radius"]: "9999px",
              ["--epr-picker-border-radius"]: "16px",
              ["--epr-skin-tone-size"]: "28px",
              ["--epr-search-input-height"]: "40px",
            } as CSSProperties
          }
          width={Math.min(352, typeof window !== "undefined" ? window.innerWidth - 24 : 352)}
          height={400}
          searchPlaceHolder="Search emoji"
          previewConfig={{ showPreview: false }}
          lazyLoadEmojis
        />
      </PopoverContent>
    </Popover>
  );
}
