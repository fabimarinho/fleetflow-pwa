import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, KeyRound, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/lib/api";
import { getMe } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface RespostaPerfil {
  success: boolean;
  message: string;
  data: UsuarioAutenticado;
}

interface RespostaPadrao {
  success: boolean;
  message: string;
}

function nomePerfil(perfil?: string) {
  switch (perfil) {
    case "ADMINISTRADOR":
      return "Administrador";
    case "GESTOR":
      return "Gestor";
    case "MOTORISTA":
      return "Motorista";
    default:
      return perfil || "Não informado";
  }
}

export function MeuPerfilForm() {
  const qc = useQueryClient();

  const perfilQuery = useQuery({
    queryKey: ["perfil-atual"],
    queryFn: getMe,
    retry: false,
  });

  const usuario = perfilQuery.data;

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [matricula, setMatricula] = useState("");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome ?? "");
      setTelefone(usuario.telefone ?? "");
      setMatricula(usuario.matricula ?? "");
    }
  }, [usuario]);

  const salvarPerfilMutation = useMutation({
    mutationFn: async () => {
      const nomeLimpo = nome.trim();

      if (nomeLimpo.length < 2 || nomeLimpo.length > 100) {
        throw new Error("O nome deve ter entre 2 e 100 caracteres.");
      }

      if (telefone.trim().length > 20) {
        throw new Error("O telefone deve ter no máximo 20 caracteres.");
      }

      if (matricula.trim().length > 30) {
        throw new Error("A matrícula deve ter no máximo 30 caracteres.");
      }

      return apiRequest<RespostaPerfil>("/auth/me/perfil", {
        method: "PUT",
        body: JSON.stringify({
          nome: nomeLimpo,
          telefone: telefone.trim() || null,
          matricula: matricula.trim() || null,
        }),
      });
    },
    onSuccess: (response) => {
      toast.success(response.message || "Perfil atualizado com sucesso.");

      qc.setQueryData(["perfil-atual"], response.data);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["perfil-atual"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const alterarSenhaMutation = useMutation({
    mutationFn: async () => {
      if (!senhaAtual) {
        throw new Error("Informe sua senha atual.");
      }

      if (novaSenha.length < 8 || novaSenha.length > 72) {
        throw new Error("A nova senha deve ter entre 8 e 72 caracteres.");
      }

      if (novaSenha !== confirmarSenha) {
        throw new Error("A confirmação da nova senha não confere.");
      }

      if (senhaAtual === novaSenha) {
        throw new Error("A nova senha deve ser diferente da senha atual.");
      }

      return apiRequest<RespostaPadrao>("/auth/me/senha", {
        method: "PUT",
        body: JSON.stringify({
          senhaAtual,
          novaSenha,
        }),
      });
    },
    onSuccess: (response) => {
      toast.success(response.message || "Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (perfilQuery.isLoading) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Carregando seus dados...
      </Card>
    );
  }

  if (perfilQuery.isError || !usuario) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">
          Não foi possível carregar seus dados. Verifique sua sessão e tente novamente.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => perfilQuery.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4" />
          Dados pessoais
        </div>

        <Separator />

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            salvarPerfilMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="perfil-nome">Nome completo</Label>
            <Input
              id="perfil-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil-email">E-mail</Label>
            <Input
              id="perfil-email"
              type="email"
              value={usuario.email}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Para alterar o e-mail, solicite a alteração a um administrador.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perfil-telefone">Telefone</Label>
              <Input
                id="perfil-telefone"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil-matricula">Matrícula</Label>
              <Input
                id="perfil-matricula"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                maxLength={30}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Secretaria</Label>
              <div className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {usuario.secretaria?.nome || "Nenhuma secretaria vinculada"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <div className="flex min-h-10 items-center gap-2 rounded-md border px-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Badge variant="secondary">
                  {nomePerfil(usuario.perfil)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={usuario.ativo ? "default" : "destructive"}>
              {usuario.ativo ? "Conta ativa" : "Conta inativa"}
            </Badge>
          </div>

          <Button
            type="submit"
            disabled={salvarPerfilMutation.isPending}
          >
            {salvarPerfilMutation.isPending
              ? "Salvando..."
              : "Salvar alterações"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4" />
          Alterar senha
        </div>

        <Separator />

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            alterarSenhaMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(event) => setSenhaAtual(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
            <p className="text-xs text-muted-foreground">
              A senha deve ter entre 8 e 72 caracteres.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={alterarSenhaMutation.isPending}
          >
            {alterarSenhaMutation.isPending
              ? "Atualizando..."
              : "Atualizar senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
