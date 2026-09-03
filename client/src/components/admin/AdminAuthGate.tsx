import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TaoSpinner } from "@/components/TaoSpinner";
import { getLoginUrl } from "@/const";
import { isAdminRole } from "@shared/adminRole";
import type { ReactNode } from "react";

function SignInCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3] p-4">
      <Card className="max-w-md w-full p-8 text-center bg-white border border-[#1a472a]/15">
        <h1 className="text-2xl font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Admin sign in
        </h1>
        <p className="text-[#1a472a] mb-6">
          Sign in with the Google, Apple, or email account that holds an admin role. The founder login is rieki.cordon@gmail.com.
        </p>
        <Button
          onClick={() => {
            const returnTo =
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/admin";
            window.location.href = getLoginUrl(returnTo);
          }}
          className="w-full min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
        >
          Continue with OAuth
        </Button>
      </Card>
    </div>
  );
}

function DeniedCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3] p-4">
      <Card className="max-w-md w-full p-8 text-center bg-white border border-[#1a472a]/15">
        <h1 className="text-2xl font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Admin access required
        </h1>
        <p className="text-[#1a472a] mb-6">
          This account is signed in and is not an admin. Use rieki.cordon@gmail.com, or ask an admin to raise the role on your player account.
        </p>
        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          className="w-full min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
        >
          Back to the site
        </Button>
      </Card>
    </div>
  );
}

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <TaoSpinner fullPage size={72} />;
  if (!user) return <SignInCard />;
  if (!isAdminRole(user.role)) return <DeniedCard />;
  return <>{children}</>;
}
