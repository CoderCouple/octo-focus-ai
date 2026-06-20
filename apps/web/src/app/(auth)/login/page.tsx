import { Bot, Focus, Users } from "lucide-react";
import { AuthBackdrop } from "../_components/auth-backdrop";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <main className="bg-background relative flex min-h-svh flex-col items-center overflow-hidden p-6 md:p-10">
      <AuthBackdrop />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 pt-[380px] pb-12">
        <div className="text-foreground flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
              <Focus className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="text-xl font-medium tracking-tight">OctoFocusAI</div>
          </div>
          <p className="text-muted-foreground inline-flex flex-wrap items-center justify-center gap-x-1.5 text-sm">
            A focused workspace for
            <Users className="size-3.5" strokeWidth={1.75} aria-hidden />
            Humans and
            <Bot className="size-3.5" strokeWidth={1.75} aria-hidden />
            Agents.
          </p>
        </div>
        <LoginForm mode="login" />
      </div>
    </main>
  );
}
