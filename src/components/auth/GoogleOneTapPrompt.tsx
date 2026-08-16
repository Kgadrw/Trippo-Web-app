import { useGoogleOneTapLogin, type CredentialResponse } from "@react-oauth/google";

type GoogleOneTapPromptProps = {
  onSuccess: (response: CredentialResponse) => void;
  onError?: () => void;
  disabled?: boolean;
  /**
   * When true, sign in automatically when Google detects a returning account.
   * Off by default: it silently re-authenticates users who just logged out.
   */
  autoSelect?: boolean;
};

/**
 * Shows Google's One Tap / "Continue with Google" prompt without clicking the button.
 */
export function GoogleOneTapPrompt({
  onSuccess,
  onError,
  disabled = false,
  autoSelect = false,
}: GoogleOneTapPromptProps) {
  const hasClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useGoogleOneTapLogin({
    onSuccess,
    onError,
    disabled: disabled || !hasClientId,
    auto_select: autoSelect,
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: true,
    context: "signin",
  });

  return null;
}
