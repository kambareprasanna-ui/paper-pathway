import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOMAIYA_LOGO_DATA_URI } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Register — Paper Path" },
      {
        name: "description",
        content: "Faculty registration for Paper Path. Accounts activate once the HOD approves.",
      },
      { property: "og:title", content: "Register — Paper Path" },
      { property: "og:description", content: "Create a faculty account for question paper design." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    institution_code: "",
    department: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);

  const institutions = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const { data } = await supabase.from("institutions").select("id, code, name").order("code");
      return data ?? [];
    },
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.institution_code) {
      toast.error("Pick your institution");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: form.full_name,
          department: form.department,
          institution_code: form.institution_code,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — waiting for HOD approval.");
    void navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="surface w-full max-w-lg space-y-5 p-6 sm:p-8">
        <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-10" />
        <div>
          <h1 className="font-display text-2xl">Faculty registration</h1>
          <p className="text-sm text-muted-foreground">
            Your account stays pending until an HOD in your department approves it.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            required
            className="h-11"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inst">Institution</Label>
            <Select
              value={form.institution_code}
              onValueChange={(v) => setForm({ ...form, institution_code: v })}
            >
              <SelectTrigger id="inst" className="h-11">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {(institutions.data ?? []).map((inst) => (
                  <SelectItem key={inst.id} value={inst.code}>
                    {inst.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept">Department</Label>
            <Input
              id="dept"
              required
              className="h-11"
              placeholder="Computer Engineering"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            className="h-11"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            className="h-11"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
