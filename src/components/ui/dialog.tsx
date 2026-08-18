import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** Stronger field visibility inside modals (theme-aware surfaces). */
export const modalFieldStyles =
  "[&_label]:text-foreground/80 [&_label]:font-medium [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:!bg-card [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:!text-foreground [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:placeholder:text-muted-foreground [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:!rounded [&_input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file])]:shadow-sm [&_input[type=date]]:!rounded [&_input[type=month]]:!rounded [&_input[type=time]]:!rounded [&_textarea]:!bg-card [&_textarea]:!text-foreground [&_textarea]:placeholder:text-muted-foreground [&_textarea]:!rounded [&_textarea]:shadow-sm [&_button[role=combobox]]:!bg-card [&_button[role=combobox]]:!text-foreground [&_button[role=combobox]]:!rounded [&_button[role=combobox]]:shadow-sm";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/** Keep centered dialogs inside the visible viewport on phones (and with the keyboard open). */
export const modalViewportClass =
  "max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]";

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Raised above nested hosts (e.g. settings) when opening a second dialog. */
  overlayClassName?: string;
  /** Scroll the body when content is taller than the screen. Default true. */
  scrollable?: boolean;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, overlayClassName, scrollable = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-card p-6 text-foreground shadow-[0_20px_50px_-12px_rgba(15,23,42,0.28)] duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        modalFieldStyles,
        className,
        scrollable && cn(modalViewportClass, "flex flex-col overflow-hidden"),
      )}
      {...props}
    >
      {scrollable ? (
        <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain [gap:inherit]">
          {children}
        </div>
      ) : (
        children
      )}
      <DialogPrimitive.Close className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-80 ring-offset-background transition-colors hover:bg-muted hover:text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-900", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
