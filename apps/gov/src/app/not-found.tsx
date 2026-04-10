import Link from "next/link";
import { Home } from "lucide-react";
import { PillButton } from "@/components/PillButton";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-white/65 text-sm mb-6 max-w-md">
        This page does not exist yet. It might be coming in a future sprint.
      </p>
      <Link href="/">
        <PillButton>
          <Home className="w-4 h-4 mr-2 inline" />
          Back to Home
        </PillButton>
      </Link>
    </div>
  );
}
