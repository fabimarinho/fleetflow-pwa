import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, ShieldCheck, ShieldAlert, Car } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/servidores")({
  component: ServidoresPage,
});

type Role = "administrador" | "gestor" | "motorista";
const ROLES: Role[] = ["administrador", "gestor", "motorista"];

function ServidoresPage() {
  const { data: me } = useProfile();
  const isAdmin = me?.role === "administrador";
  const qc = useQueryClient();

  const { data: rows } = useQuery({
    queryKey: ["servidores"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*, secretarias(nome,sigla)").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser: Record<string, Role[]> = {};
      (roles ?? []).forEach((r: any) => {
        (byUser[r.user_id] ||= []).push(r.role);
      });
      return (profiles ?? []).map((p: any) => {
        const list = byUser[p.id] ?? [];
        const role: Role = list.includes("administrador")
          ? "administrador"
          : list.includes("gestor")
          ? "gestor"
          : "motorista";
        return { ...p, role };
      });
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () =>
      (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const roleMut = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["servidores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const secMut = useMutation({
    mutationFn: async ({ userId, secretariaId }: { userId: string; secretariaId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ secretaria_id: secretariaId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Secretaria atualizada");
      qc.invalidateQueries({ queryKey: ["servidores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Servidores</h1>
        <p className="text-sm text-muted-foreground">
          Usuários cadastrados e suas permissões
        </p>
      </div>

      <Card className="p-0 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Servidor</th>
              <th className="text-left p-3">Matrícula</th>
              <th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Secretaria</th>
              <th className="text-left p-3">Permissão</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.nome ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{u.matricula ?? "—"}</td>
                <td className="p-3">{u.telefone ?? "—"}</td>
                <td className="p-3 min-w-[200px]">
                  {isAdmin ? (
                    <Select
                      value={u.secretaria_id ?? ""}
                      onValueChange={(v) =>
                        secMut.mutate({ userId: u.id, secretariaId: v || null })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {(secretarias ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    u.secretarias?.nome ?? "—"
                  )}
                </td>
                <td className="p-3 min-w-[180px]">
                  {isAdmin && u.id !== me?.user?.id ? (
                    <Select
                      value={u.role}
                      onValueChange={(v: Role) =>
                        roleMut.mutate({ userId: u.id, role: v })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {labelRole(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Nenhum servidor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* mobile */}
      <div className="grid gap-3 md:hidden">
        {(rows ?? []).map((u: any) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{u.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.secretarias?.nome ?? "Sem secretaria"}
                </p>
              </div>
              <RoleBadge role={u.role} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function labelRole(r: Role) {
  if (r === "administrador") return "Administrador";
  if (r === "gestor") return "Gestor";
  return "Motorista";
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "administrador")
    return (
      <Badge className="bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/20">
        <ShieldAlert className="mr-1 h-3 w-3" /> Administrador
      </Badge>
    );
  if (role === "gestor")
    return (
      <Badge className="bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/20">
        <ShieldCheck className="mr-1 h-3 w-3" /> Gestor
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Car className="mr-1 h-3 w-3" /> Motorista
    </Badge>
  );
}