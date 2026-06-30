import { useCallback, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { useToast } from "@/hooks/use-toast";
import { authApi, ApiError } from "@/lib/api";
import { redirectToBookfyWithSession } from "@/hooks/useSubdomain";
import { setLoginPrefs } from "@/lib/loginPrefs";

type UseGoogleAuthOptions = {
  onSuccess?: () => void;
  redirectToBookfy?: boolean;
  rememberLogin?: boolean;
};

function storeUserSession(
  user: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    businessName?: string;
    profilePictureUrl?: string;
  },
  emailForRemember?: string,
  remember = true,
) {
  if (user.name) localStorage.setItem("profit-pilot-user-name", user.name);
  if (user.email) localStorage.setItem("profit-pilot-user-email", user.email);
  if (user.businessName?.trim()) {
    localStorage.setItem("profit-pilot-business-name", user.businessName.trim());
  } else {
    localStorage.removeItem("profit-pilot-business-name");
  }
  if (user.profilePictureUrl) {
    localStorage.setItem("profit-pilot-profile-picture-url", user.profilePictureUrl);
  } else {
    localStorage.removeItem("profit-pilot-profile-picture-url");
  }
  if (user._id || user.id) {
    localStorage.setItem("profit-pilot-user-id", user._id || user.id || "");
  }

  localStorage.setItem("profit-pilot-authenticated", "true");
  window.dispatchEvent(new Event("pin-auth-changed"));
  window.dispatchEvent(new Event("user-data-changed"));

  if (emailForRemember) {
    setLoginPrefs(emailForRemember, remember);
  }
}

export function useGoogleAuth({
  onSuccess,
  redirectToBookfy = false,
  rememberLogin = true,
}: UseGoogleAuthOptions = {}) {
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      const credential = credentialResponse.credential;
      if (!credential) return;

      setIsGoogleLoading(true);

      try {
        const response = await authApi.googleAuth({ credential });

        if (response.needsProfile) {
          return;
        }

        if (!response.user) return;

        const welcome = response.created
          ? {
              title: "Account created!",
              description: response.merged
                ? "Your Google account is now linked to your existing Trippo account."
                : "Welcome to Trippo. Your Google account is connected.",
            }
          : response.merged
            ? {
                title: "Account linked",
                description:
                  "Your Google account is now linked. You can sign in with Google or your password.",
              }
            : {
                title: "Welcome back!",
                description: "You have successfully signed in with Google.",
              };

        storeUserSession(response.user, response.user.email, rememberLogin);

        toast({
          title: welcome.title,
          description: welcome.description,
        });

        if (redirectToBookfy) {
          redirectToBookfyWithSession("/");
          return;
        }

        onSuccess?.();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Google sign-in failed. Please try again.";
        toast({
          title: "Google sign-in failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [onSuccess, redirectToBookfy, rememberLogin, toast],
  );

  return { handleGoogleSuccess, isGoogleLoading };
}
