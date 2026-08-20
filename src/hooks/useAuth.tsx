import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, AccountStatus } from "@/lib/types";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  institution_id: string | null;
  department: string;
  account_status: AccountStatus;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setReady(true);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries();
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return { session, ready, user: session?.user ?? null };
}

export function useProfile() {
  const { user, ready } = useSession();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return {
        profile: (profile as Profile | null) ?? null,
        roles: ((roles ?? []) as { role: AppRole }[]).map((r) => r.role),
      };
    },
  });

  return {
    ready: ready && (!user || !query.isLoading),
    user,
    profile: query.data?.profile ?? null,
    roles: query.data?.roles ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useHasRole(role: AppRole) {
  const { roles } = useProfile();
  return roles.includes(role);
}
