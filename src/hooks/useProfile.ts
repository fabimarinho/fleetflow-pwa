import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/auth";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],

    queryFn: async () => {
      const usuario = await getMe();

      if (!usuario) {
        return null;
      }

      const role =
        usuario.perfil === "ADMINISTRADOR"
          ? "administrador"
          : usuario.perfil === "GESTOR"
            ? "gestor"
            : "motorista";

      return {
        user: {
          id: usuario.id,
          email: usuario.email,
        },

        profile: {
          id: usuario.id,
          nome: usuario.nome,
          matricula: usuario.matricula,
          telefone: usuario.telefone,
          secretaria_id:
            usuario.secretaria?.id ?? null,
          secretarias: usuario.secretaria,
        },

        roles: [role],

        role,

        isAdmin:
          usuario.perfil === "ADMINISTRADOR",

        isAdminOrGestor:
          usuario.perfil === "ADMINISTRADOR" ||
          usuario.perfil === "GESTOR",
      };
    },

    retry: false,
  });
}
