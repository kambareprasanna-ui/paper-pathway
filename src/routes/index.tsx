import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOMAIYA_LOGO_DATA_URI, APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { ROLE_LABELS, roleHome, type AppRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Paper Path" },
      {
        name: "description",
        content:
          "Sign in to Paper Path to design, review and release question papers for your institute.",
      },
      { property: "og:title", content: "Sign in — Paper Path" },
      {
        property: "og:description",
        content: "Institution portal for HOD assignment, DQC review and coordinator print.",
      },
    ],
  }),
  component: LoginPage,
});

const ROLES: AppRole[] = ["hod", "dqc", "designer", "coord"];

function LoginPage() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<string>("");
  const [role, setRole] = useState<AppRole>("designer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const institutions = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const { data } = await supabase.from("institutions").select("id, code, name").order("code");
      return data ?? [];
    },
  });

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      toast.error(error?.message ?? "Could not sign in");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const owned = ((roles ?? []) as { role: AppRole }[]).map((r) => r.role);
    setBusy(false);

    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect && redirect.startsWith("/")) {
      window.location.href = redirect;
      return;
    }
    const target = owned.includes(role) ? roleHome[role] : roleHome[owned[0] ?? "designer"];
    void navigate({ to: target });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="brand-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-14 w-fit rounded-lg bg-card px-3 py-2" />
        <div>
          <h1 className="font-display text-5xl leading-tight">{APP_NAME}</h1>
          <p className="mt-4 max-w-md text-lg text-primary-foreground/80">{APP_TAGLINE}</p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/75">
            <li>• Faculty design papers with CO and BT (H/M) tagging</li>
            <li>• Year level routes the paper to the DQC that owns it</li>
            <li>• Only the Exam Coordinator prints, and only after approval</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">Somaiya Vidyavihar University</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <form onSubmit={signIn} className="surface w-full max-w-md space-y-5 p-6 sm:p-8">
          <div className="lg:hidden">
            <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-10" />
          </div>
          <div>
            <h2 className="font-display text-2xl">Sign in</h2>
            <p className="text-sm text-muted-foreground">Choose your portal and role to continue.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution portal</Label>
            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger id="institution" className="h-11">
                <SelectValue placeholder="Select your institute" />
              </SelectTrigger>
              <SelectContent>
                {(institutions.data ?? []).map((inst) => (
                  <SelectItem key={inst.id} value={inst.code}>
                    {inst.code} — {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sign in as</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as AppRole)}
              className="grid grid-cols-2 gap-2"
            >
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"
                >
                  <RadioGroupItem value={r} id={`role-${r}`} />
                  <span>{ROLE_LABELS[r]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@somaiya.edu"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/auth/forgot" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              className="h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New faculty member?{" "}
            <Link to="/auth/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
