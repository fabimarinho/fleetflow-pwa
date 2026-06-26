import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setReady(false);
        navigate({ to: "/auth", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return null;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}