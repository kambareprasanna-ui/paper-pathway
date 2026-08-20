import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOMAIYA_LOGO_DATA_URI } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({
    meta: [
      { title: "Reset your password — Paper Path" },
      { name: "description", content: "Request a password reset link for your Paper Path account." },
      { property: "og:title", content: "Reset your password — Paper Path" },
      { property: "og:description", content: "Send yourself a secure password reset link." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md space-y-5 p-6 sm:p-8">
        <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-10" />
        <h1 className="font-display text-2xl">Forgot password</h1>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset
            link is on its way. The link opens the password reset page.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your institute email and we'll send a reset link.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link to="/" className="block text-center text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
