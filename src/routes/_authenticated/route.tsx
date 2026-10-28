import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { getMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async () => {
    const usuario = await getMe();

    if (!usuario) {
      throw redirect({
        to: "/auth",
      });
    }

    return {
      user: usuario,
    };
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
