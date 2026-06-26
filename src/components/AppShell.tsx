import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";

function roleLabel(role?: string) {
  if (role === "administrador") return "Administrador";
  if (role === "gestor") return "Gestor";
  return "Motorista";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useProfile();
  const nome = data?.profile?.nome || data?.user?.email || "Usuário";
  const initials = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 h-14 flex items-center gap-3 border-b bg-card px-3 sm:px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
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
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 max-w-full">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}