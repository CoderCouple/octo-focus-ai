import { Focus } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
            <Focus className="size-3.5" strokeWidth={2.25} />
          </div>
          OctoFocusAI
        </Link>
        <LoginForm mode="login" />
      </div>
    </div>
  );
}
