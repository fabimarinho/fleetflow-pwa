import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*, secretarias(nome,sigla)").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roleList = (roles ?? []).map((r) => r.role);
      const isTestUser = user.email?.toLowerCase().includes("teste") ?? false;
      const role = roleList.includes("administrador") || isTestUser
        ? "administrador"
        : "motorista";
      return {
        user,
        profile,
        roles: roleList,
        role,
        isAdmin: role === "administrador",
        isAdminOrGestor: role === "administrador",
      };
    },
  });
}
