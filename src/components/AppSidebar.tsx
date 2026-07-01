import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Car,
  MapPin,
  Users,
  Building2,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  Crown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, disabled: false },
  { title: "Veículos", url: "/veiculos", icon: Car, disabled: false },
  { title: "Viagens", url: "/viagens", icon: MapPin, disabled: false },
  { title: "Servidores", url: "/servidores", icon: Users, disabled: false },
  { title: "Secretarias", url: "/secretarias", icon: Building2, disabled: false },
  { title: "Abastecimentos", url: "/abastecimentos", icon: Fuel, disabled: false },
  { title: "Manutenções", url: "/manutencoes", icon: Wrench, disabled: false },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, disabled: false },
  { title: "Configurações", url: "#", icon: Settings, disabled: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (url: string) =>
    pathname === url || (url !== "/dashboard" && url !== "#" && pathname.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Crown className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70 leading-tight">
                Prefeitura Municipal
              </p>
              <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">
                Gestão de Frota
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <SidebarMenuButton
                      tooltip={`${item.title} (em breve)`}
                      className="opacity-50 cursor-not-allowed"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <p className="px-2 pb-2 text-[10px] text-sidebar-foreground/50">v1.0.0 · © 2026</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}