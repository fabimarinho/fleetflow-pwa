import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, KeyRound } from "lucide-react";
import { traduzErroAuth } from "@/lib/authErrors";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["perfil-atual"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, secretarias(nome,sigla)")
        .eq("id", user.id)
        .maybeSingle();
      return { user, profile };
    },
  });

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [matricula, setMatricula] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setNome(data.profile.nome ?? "");
      setTelefone(data.profile.telefone ?? "");
      setMatricula(data.profile.matricula ?? "");
    }
  }, [data?.profile]);

  const salvar = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          nome: z.string().trim().min(2, "Informe seu nome").max(100),
          telefone: z.string().trim().max(20).optional().or(z.literal("")),
          matricula: z.string().trim().max(30).optional().or(z.literal("")),
        })
        .parse({ nome, telefone, matricula });
      if (!data?.user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: parsed.nome,
          telefone: parsed.telefone || null,
          matricula: parsed.matricula || null,
        })
        .eq("id", data.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["perfil-atual"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // senha
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres").max(72),
        senha2: z.string(),
      })
      .refine((v) => v.senha === v.senha2, {
        message: "As senhas não coincidem",
        path: ["senha2"],
      })
      .safeParse({ senha, senha2 });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoadingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
    setLoadingSenha(false);
    if (error) {
      toast.error(traduzErroAuth(error.message));
      return;
    }
    toast.success("Senha atualizada");
    setSenha("");
    setSenha2("");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Atualize seus dados pessoais e sua senha.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4" /> Dados pessoais
        </div>
        <Separator />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={data?.user?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              Para alterar o e-mail, entre em contato com um administrador.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            </div>
          </div>
          {data?.profile?.secretarias && (
            <div className="space-y-2">
              <Label>Secretaria</Label>
              <Input value={data.profile.secretarias.nome} disabled />
            </div>
          )}
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4" /> Alterar senha
        </div>
        <Separator />
        <form className="space-y-4" onSubmit={trocarSenha}>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha2">Confirmar nova senha</Label>
            <Input
              id="senha2"
              type="password"
              autoComplete="new-password"
              value={senha2}
              onChange={(e) => setSenha2(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" disabled={loadingSenha}>
            {loadingSenha ? "Atualizando..." : "Atualizar senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}