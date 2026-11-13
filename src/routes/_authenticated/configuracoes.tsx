
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Pencil, Search, Settings, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { MeuPerfilForm } from "@/components/MeuPerfilForm";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

type Perfil = "ADMINISTRADOR" | "GESTOR" | "MOTORISTA";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula?: string | null;
  telefone?: string | null;
  perfil: Perfil;
  ativo: boolean;
  secretariaId?: string | null;
  secretaria?: {
    id: string;
    nome: string;
    sigla?: string | null;
  } | null;
}

interface Secretaria {
  id: string;
  nome: string;
  sigla?: string | null;
  ativa?: boolean;
}

interface FormUsuario {
  nome: string;
  email: string;
  senha: string;
  matricula: string;
  telefone: string;
  perfil: Perfil;
  secretariaId: string;
}

interface ConfiguracaoSistema {
  nomeSistema: string;
}

const formularioInicial: FormUsuario = {
  nome: "",
  email: "",
  senha: "",
  matricula: "",
  telefone: "",
  perfil: "MOTORISTA",
  secretariaId: "",
};

function ConfiguracoesPage() {
  const { data: me } = useProfile();
  const podeAdministrar = !!me?.isAdmin;
  const qc = useQueryClient();

  const [aba, setAba] = useState("usuarios");
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormUsuario>(formularioInicial);
  const [nomeSistema, setNomeSistema] = useState("Gestão de Frota");

  const configuracaoQuery = useQuery({
    queryKey: ["configuracao-sistema"],
    queryFn: async () => {
      const response = await apiRequest<{
        success: boolean;
        data: ConfiguracaoSistema;
      }>("/configuracoes-sistema");

      return response.data;
    },
    enabled: podeAdministrar,
  });

  useEffect(() => {
    if (configuracaoQuery.data?.nomeSistema) {
      setNomeSistema(configuracaoQuery.data.nomeSistema);
    }
  }, [configuracaoQuery.data]);

  const salvarNomeSistemaMutation = useMutation({
    mutationFn: async () => {
      const nome = nomeSistema.trim();

      if (!nome) {
        throw new Error("Informe o nome do sistema.");
      }

      if (nome.length > 100) {
        throw new Error("O nome deve ter no máximo 100 caracteres.");
      }

      return apiRequest("/configuracoes-sistema", {
        method: "PUT",
        body: JSON.stringify({ nomeSistema: nome }),
      });
    },
    onSuccess: () => {
      toast.success("Nome do sistema atualizado com sucesso.");
      qc.invalidateQueries({ queryKey: ["configuracao-sistema"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const usuariosQuery = useQuery({
    queryKey: ["configuracoes-usuarios"],
    queryFn: async () => {
      const response = await apiRequest<{ data: Usuario[] }>("/usuarios");
      return response.data ?? [];
    },
    enabled: podeAdministrar,
  });

  const secretariasQuery = useQuery({
    queryKey: ["configuracoes-secretarias"],
    queryFn: async () => {
      const response = await apiRequest<{ data: Secretaria[] }>("/secretarias");
      return response.data ?? [];
    },
    enabled: podeAdministrar,
  });

  const usuarios = usuariosQuery.data ?? [];
  const secretarias = (secretariasQuery.data ?? []).filter(
    (s) => s.ativa !== false
  );

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;

    return (
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (u.matricula ?? "").toLowerCase().includes(termo) ||
      (u.secretaria?.nome ?? "").toLowerCase().includes(termo)
    );
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const dados: Record<string, unknown> = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        matricula: form.matricula.trim() || null,
        telefone: form.telefone.trim() || null,
        perfil: form.perfil,
        secretariaId: form.secretariaId || null,
      };

      if (form.senha.trim()) dados.senha = form.senha;

      if (editing) {
        await apiRequest(`/usuarios/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(dados),
        });
      } else {
        await apiRequest("/usuarios", {
          method: "POST",
          body: JSON.stringify({
            ...dados,
            senha: form.senha,
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success(
        editing
          ? "Usuário atualizado com sucesso."
          : "Usuário cadastrado com sucesso."
      );
      qc.invalidateQueries({ queryKey: ["configuracoes-usuarios"] });
      setOpen(false);
      setEditing(null);
      setForm(formularioInicial);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: async (usuario: Usuario) => {
      await apiRequest(`/usuarios/${usuario.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !usuario.ativo }),
      });
    },
    onSuccess: () => {
      toast.success("Status do usuário atualizado.");
      qc.invalidateQueries({ queryKey: ["configuracoes-usuarios"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function abrirNovo() {
    setEditing(null);
    setForm(formularioInicial);
    setOpen(true);
  }

  function abrirEdicao(usuario: Usuario) {
    setEditing(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      matricula: usuario.matricula ?? "",
      telefone: usuario.telefone ?? "",
      perfil: usuario.perfil,
      secretariaId: usuario.secretariaId ?? "",
    });
    setOpen(true);
  }

  if (!podeAdministrar) {
    return (
      <Card className="p-8 text-center">
        <Settings className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Somente administradores podem acessar as configurações do sistema.
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Administração e personalização do sistema de gestão de frota.
        </p>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Settings className="h-4 w-4" />
            <span>Sistema</span>
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2">
            <UserCircle className="h-4 w-4" />
            <span>Meu perfil</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Usuários e permissões</h2>
              <p className="text-sm text-muted-foreground">
                Cadastre usuários e controle seus níveis de acesso.
              </p>
            </div>

            <Button onClick={abrirNovo} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo usuário
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Pesquisar por nome, e-mail, matrícula ou secretaria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {usuariosFiltrados.map((usuario) => (
              <Card key={usuario.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <UserCircle className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-semibold">{usuario.nome}</h3>
                      <Badge variant={usuario.ativo ? "default" : "secondary"}>
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {usuario.email}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {usuario.perfil === "ADMINISTRADOR"
                        ? "Administrador"
                        : usuario.perfil === "GESTOR"
                          ? "Gestor"
                          : "Motorista"}
                      {usuario.secretaria?.nome
                        ? ` · ${usuario.secretaria.nome}`
                        : ""}
                    </p>

                    {usuario.matricula && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Matrícula: {usuario.matricula}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicao(usuario)}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </Button>

                      <Button
                        variant={usuario.ativo ? "destructive" : "outline"}
                        size="sm"
                        disabled={
                          statusMutation.isPending ||
                          usuario.id === me?.user?.id
                        }
                        onClick={() => {
                          const acao = usuario.ativo ? "desativar" : "ativar";
                          if (
                            confirm(
                              `Deseja ${acao} o usuário ${usuario.nome}?`
                            )
                          ) {
                            statusMutation.mutate(usuario);
                          }
                        }}
                      >
                        {usuario.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {!usuariosQuery.isLoading && usuariosFiltrados.length === 0 && (
              <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </Card>
            )}

            {usuariosQuery.isLoading && (
              <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
                Carregando usuários...
              </Card>
            )}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar usuário" : "Cadastrar usuário"}
                </DialogTitle>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.nome.trim() || !form.email.trim()) return;
                  if (!editing && form.senha.length < 8) {
                    toast.error("A senha deve possuir pelo menos 8 caracteres.");
                    return;
                  }
                  if (salvarMutation.isPending) return;
                  salvarMutation.mutate();
                }}
              >
                <div className="space-y-1">
                  <Label>Nome completo *</Label>
                  <Input
                    required
                    value={form.nome}
                    onChange={(e) =>
                      setForm({ ...form, nome: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>E-mail *</Label>
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>
                    {editing ? "Nova senha (opcional)" : "Senha *"}
                  </Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required={!editing}
                    placeholder={
                      editing
                        ? "Deixe vazio para manter a senha atual"
                        : "Mínimo de 8 caracteres"
                    }
                    value={form.senha}
                    onChange={(e) =>
                      setForm({ ...form, senha: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Matrícula</Label>
                    <Input
                      value={form.matricula}
                      onChange={(e) =>
                        setForm({ ...form, matricula: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) =>
                        setForm({ ...form, telefone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Perfil de acesso *</Label>
                  <Select
                    value={form.perfil}
                    onValueChange={(value) =>
                      setForm({ ...form, perfil: value as Perfil })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMINISTRADOR">
                        Administrador
                      </SelectItem>
                      <SelectItem value="GESTOR">Gestor</SelectItem>
                      <SelectItem value="MOTORISTA">Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Secretaria</Label>
                  <Select
                    value={form.secretariaId || "nenhuma"}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        secretariaId: value === "nenhuma" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a secretaria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">
                        Nenhuma secretaria
                      </SelectItem>
                      {secretarias.map((secretaria) => (
                        <SelectItem key={secretaria.id} value={secretaria.id}>
                          {secretaria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={salvarMutation.isPending}
                  >
                    {salvarMutation.isPending
                      ? "Salvando..."
                      : "Salvar usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sistema" className="mt-5">
          <Card className="max-w-2xl p-6">
            <Settings className="mb-3 h-8 w-8 text-muted-foreground" />

            <h2 className="font-semibold">Dados do sistema</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Defina o nome que será exibido na identificação do sistema.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                salvarNomeSistemaMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="nomeSistema">Nome do sistema</Label>
                <Input
                  id="nomeSistema"
                  value={nomeSistema}
                  onChange={(e) => setNomeSistema(e.target.value)}
                  placeholder="Digite o nome do sistema"
                  maxLength={100}
                  required
                  disabled={configuracaoQuery.isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de 100 caracteres.
                </p>
              </div>

              <Button
                type="submit"
                disabled={
                  salvarNomeSistemaMutation.isPending ||
                  configuracaoQuery.isLoading ||
                  !nomeSistema.trim()
                }
              >
                {salvarNomeSistemaMutation.isPending
                  ? "Salvando..."
                  : "Salvar nome do sistema"}
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="perfil" className="mt-5">
          <MeuPerfilForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
