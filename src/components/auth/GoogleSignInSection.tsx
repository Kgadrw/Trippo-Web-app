import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useToast } from "@/hooks/use-toast";

type GoogleSignInSectionProps = {
  onSuccess: (response: CredentialResponse) => void;
  disabled?: boolean;
};

export function GoogleSignInSection({ onSuccess, disabled = false }: GoogleSignInSectionProps) {
  const { toast } = useToast();

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <div className={`flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {
            toast({
              title: "Google sign-in failed",
              description: "Could not open Google sign-in. Please try again.",
              variant: "destructive",
            });
          }}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          width="100%"
        />
      </div>
    </>
  );
}
