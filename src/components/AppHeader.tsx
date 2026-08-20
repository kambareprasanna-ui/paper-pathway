import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { SOMAIYA_LOGO_DATA_URI, APP_NAME } from "@/lib/branding";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const NAV: { to: string; label: string; role: AppRole | null }[] = [
  { to: "/hod", label: "HOD", role: "hod" },
  { to: "/dqc", label: "DQC queue", role: "dqc" },
  { to: "/designer", label: "My papers", role: "designer" },
  { to: "/coord", label: "Coordinator", role: "coord" },
  { to: "/tracking", label: "Tracking", role: null },
];

export function AppHeader() {
  const { profile, roles, user } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifications = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as NotificationRow[];
    },
  });

  // Live inserts instead of polling.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;
  const items = NAV.filter((item) => item.role === null || roles.includes(item.role));

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/" });
  }

  const navLinks = (
    <>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="brand-gradient sticky top-0 z-40 pt-[env(safe-area-inset-top)] shadow-md">
      <div className="page-shell flex items-center gap-3 py-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 brand-gradient border-none">
            <div className="mt-8 flex flex-col gap-1">{navLinks}</div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-8 rounded bg-card/95 px-2 py-1" />
          <span className="hidden font-display text-lg font-semibold text-primary-foreground sm:inline">
            {APP_NAME}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">{navLinks}</nav>

        <div className="ml-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-primary-foreground hover:bg-primary-foreground/10"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {unread}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
              <ScrollArea className="max-h-80">
                {(notifications.data ?? []).length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Nothing yet.</p>
                )}
                {(notifications.data ?? []).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      void markRead(n.id);
                      if (n.link) void navigate({ to: n.link });
                    }}
                    className="block w-full border-b px-4 py-3 text-left last:border-none hover:bg-muted"
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                      <div className={n.is_read ? "opacity-60" : ""}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-primary-foreground">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-[11px] leading-tight text-primary-foreground/70">
              {roles.map((r) => ROLE_LABELS[r]).join(" · ") || "No role yet"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
      {profile?.account_status === "pending" && (
        <div className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
          Your account is awaiting HOD approval — you can look around, but paper actions stay locked.
        </div>
      )}
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-success text-success-foreground",
    returned: "bg-destructive text-destructive-foreground",
    submitted: "bg-accent text-accent-foreground",
    in_review: "bg-accent text-accent-foreground",
    assigned: "bg-accent text-accent-foreground",
    draft: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={`${map[status] ?? "bg-muted text-muted-foreground"} border-none capitalize`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
