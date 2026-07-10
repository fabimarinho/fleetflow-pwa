import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Users, ShieldCheck, ShieldAlert, Car, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { criarServidor, excluirServidor } from "@/lib/servidores.functions";
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
  const criarFn = useServerFn(criarServidor);
  const excluirFn = useServerFn(excluirServidor);
  const [open, setOpen] = useState(false);
  const emptyForm = {
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    matricula: "",
    secretaria_id: "",
    role: "motorista" as Role,
  };
  const [form, setForm] = useState(emptyForm);

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

  const createMut = useMutation({
    mutationFn: async () => {
      await criarFn({
        data: {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          telefone: form.telefone,
          matricula: form.matricula,
          secretaria_id: form.secretaria_id,
          role: form.role,
        },
      });
    },
    onSuccess: () => {
      toast.success("Servidor cadastrado");
      qc.invalidateQueries({ queryKey: ["servidores"] });
      setForm(emptyForm);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await excluirFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Servidor excluído");
      qc.invalidateQueries({ queryKey: ["servidores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servidores</h1>
          <p className="text-sm text-muted-foreground">
            Usuários cadastrados e suas permissões
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo servidor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar servidor</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    form.nome &&
                    form.email &&
                    form.senha.length >= 6 &&
                    !createMut.isPending
                  ) {
                    createMut.mutate();
                  }
                }}
              >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="servidor@prefeitura.gov"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Senha temporária *</Label>
                  <Input
                    type="text"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Matrícula</Label>
                  <Input
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Secretaria</Label>
                  <Select
                    value={form.secretaria_id}
                    onValueChange={(v) => setForm({ ...form, secretaria_id: v })}
                  >
                    <SelectTrigger>
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
                </div>
                <div className="space-y-1">
                  <Label>Permissão *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v: Role) => setForm({ ...form, role: v })}
                  >
                    <SelectTrigger>
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
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.nome ||
                    !form.email ||
                    form.senha.length < 6 ||
                    createMut.isPending
                  }
                >
                  {createMut.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
              {isAdmin && <th className="text-right p-3">Ações</th>}
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
                {isAdmin && (
                  <td className="p-3 text-right">
                    {u.id !== me?.user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir servidor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação remove definitivamente <b>{u.nome ?? "este usuário"}</b> do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(u.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-muted-foreground">
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