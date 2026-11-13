import { ReactNode } from "react";
import {
  useRouterState,
  Link,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Car,
  MapPin,
  UserRound,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";

function roleLabel(role?: string) {
  if (role === "administrador") return "Administrador";
  return "Usuario";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useProfile();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const nome = data?.profile?.nome || data?.user?.email || "Usuário";

  const initials = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const mobileLinks = [
    {
      label: "Início",
      to: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Veículos",
      to: "/veiculos",
      icon: Car,
    },
    {
      label: "Viagens",
      to: "/viagens",
      icon: MapPin,
    },
    {
      label: "Perfil",
      to: "/perfil",
      icon: UserRound,
    },
  ] as const;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 h-14 flex items-center gap-3 border-b bg-card px-3 sm:px-6">
            <SidebarTrigger />

            <div className="flex-1" />

            <Link
              to="/perfil"
              className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-muted transition-colors"
              aria-label="Meu perfil"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium leading-tight">{nome}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Perfil: {roleLabel(data?.role)}
                </p>
              </div>

              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </header>

          <main className="flex-1 p-3 pb-24 md:pb-6 sm:p-6 max-w-full">
            {children}
          </main>
        </div>

        <nav
          aria-label="Navegação principal do celular"
          className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t bg-card px-2 pt-2 pb-2 shadow-lg md:hidden"
        >
          {mobileLinks.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.to ||
              pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-md py-1 transition-colors ${
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />

                <span className="text-[10px] leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}
