import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

const ADMIN_PASSWORD = "333";

export function AdminPasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_authenticated", "true");
      onAuthenticated();
    } else {
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] flex items-center justify-center p-4">
      <div className={isShaking ? "animate-shake" : ""}>
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-2 border-[#7dd87d]/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a472a] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#7dd87d]" />
            </div>
            <CardTitle className="text-2xl text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              Admin Access
            </CardTitle>
            <CardDescription className="text-[#1a472a]">
              Enter the password to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  aria-label="Admin password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`text-center text-lg bg-white text-[#1a472a] placeholder:text-[#1a472a] ${error ? "border-red-500 focus:ring-red-500" : "border-[#1a472a]/50 focus:ring-[#7dd87d]"}`}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
