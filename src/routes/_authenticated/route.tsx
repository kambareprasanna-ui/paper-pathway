import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useProfile } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  // Sessions live in localStorage, so the gate has to run on the client.
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { ready, user } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) {
      void navigate({
        to: "/",
        search: { redirect: window.location.pathname },
        replace: true,
      });
    }
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="page-shell flex-1 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  );
}
