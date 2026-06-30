import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type GoogleSignInSectionProps = {
  onSuccess: (response: CredentialResponse) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Pre-select a Google account when the user has signed in before. */
  loginHint?: string;
  /** Hide the "or" divider when Google is shown above the form. */
  hideDivider?: boolean;
};

function googleSignInBlockedMessage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "this site";
  return (
    `Google blocked sign-in from ${origin}. In Google Cloud Console → Credentials → your OAuth client, ` +
    `add that URL under Authorized JavaScript origins. If the app is in Testing mode, add your Gmail under OAuth consent screen → Test users.`
  );
}

export function GoogleSignInSection({
  onSuccess,
  disabled = false,
  compact = false,
  loginHint,
  hideDivider = false,
}: GoogleSignInSectionProps) {
  const { toast } = useToast();

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      {!hideDivider ? (
        <div className={cn("relative", compact ? "py-0.5" : "py-1")}>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
      ) : null}
      <div className={`flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {
            console.error("[Google sign-in] Authorization error for origin:", window.location.origin);
            toast({
              title: "Google sign-in blocked",
              description: googleSignInBlockedMessage(),
              variant: "destructive",
            });
          }}
          theme="outline"
          size={compact ? "medium" : "large"}
          text="continue_with"
          shape="pill"
          width="100%"
          login_hint={loginHint || undefined}
          use_fedcm_for_button
        />
      </div>
    </>
  );
}
