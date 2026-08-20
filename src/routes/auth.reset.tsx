import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOMAIYA_LOGO_DATA_URI } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Paper Path" },
      { name: "description", content: "Set a new password for your Paper Path account." },
      { property: "og:title", content: "Choose a new password — Paper Path" },
      { property: "og:description", content: "Finish resetting your Paper Path password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — please sign in.");
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md space-y-5 p-6 sm:p-8">
        <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-10" />
        <h1 className="font-display text-2xl">Choose a new password</h1>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </main>
  );
}
