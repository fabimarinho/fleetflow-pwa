import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Trash2, UserRound } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/servidores")({
  component: ServidoresPage,
});

type Servidor = {
  id: string;
  nome: string;
  matricula: string;
  telefone: string;
  secretaria_id: string;
  secretaria_nome: string;
  administrador: boolean;
};

type SecretariaOption = {
  id: string;
  nome: string;
  sigla?: string | null;
};

const STORAGE_KEY = "fleetflow.servidores.local";

const DEFAULT_SECRETARIAS: SecretariaOption[] = [
  { id: "saude", nome: "Secretaria de Saude", sigla: "SMS" },
  { id: "educacao", nome: "Secretaria de Educacao", sigla: "SME" },
  { id: "administracao", nome: "Secretaria de Administracao", sigla: "SMA" },
];

const emptyForm = {
  nome: "",
  matricula: "",
  telefone: "",
  secretaria_id: "",
};

function ServidoresPage() {
  const { data: me } = useProfile();
  const isAdmin = me?.role === "administrador";

  const [open, setOpen] = useState(false);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [form, setForm] = useState(emptyForm);

  const { data: dbSecretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () =>
      (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const secretarias = useMemo<SecretariaOption[]>(() => {
    return dbSecretarias?.length ? dbSecretarias : DEFAULT_SECRETARIAS;
  }, [dbSecretarias]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setServidores(JSON.parse(raw));
        return;
      }
    } catch {
      // Mantem a lista padrao se o armazenamento local estiver ilegivel.
    }

    const adminName =
      me?.profile?.nome || me?.user?.email || "Usuario teste";

    setServidores([
      {
        id: "admin-local",
        nome: adminName,
        matricula: "0001",
        telefone: "",
        secretaria_id: "administracao",
        secretaria_nome: "Secretaria de Administracao",
        administrador: true,
      },
      {
        id: "servidor-teste",
        nome: "Servidor Teste",
        matricula: "1020",
        telefone: "(00) 00000-0000",
        secretaria_id: "saude",
        secretaria_nome: "Secretaria de Saude",
        administrador: false,
      },
    ]);
  }, [me?.profile?.nome, me?.user?.email]);

  useEffect(() => {
    if (servidores.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servidores));
    }
  }, [servidores]);

  function salvarServidor(e: React.FormEvent) {
    e.preventDefault();

    if (!isAdmin) {
      toast.error("Apenas o administrador pode cadastrar servidores.");
      return;
    }

    if (!form.nome.trim()) {
      toast.error("Informe o nome do servidor.");
      return;
    }

    const secretaria = secretarias.find(
      (s) => s.id === form.secretaria_id
    );

    const id = crypto.randomUUID?.() ?? String(Date.now());

    setServidores((current) => [
      ...current,
      {
        id,
        nome: form.nome.trim(),
        matricula: form.matricula.trim(),
        telefone: form.telefone.trim(),
        secretaria_id: secretaria?.id ?? "",
        secretaria_nome: secretaria?.nome ?? "",
        administrador: false,
      },
    ]);

    toast.success("Servidor cadastrado");
    setForm(emptyForm);
    setOpen(false);
  }

  function removerServidor(id: string) {
    const servidor = servidores.find((item) => item.id === id);

    if (servidor?.administrador) {
      toast.error("O administrador principal nao pode ser removido.");
      return;
    }

    setServidores((current) =>
      current.filter((item) => item.id !== id)
    );

    toast.success("Servidor removido");
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Servidores
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro simples para uso local. Somente o administrador edita.
          </p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo servidor
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar servidor</DialogTitle>
              </DialogHeader>

              <form onSubmit={salvarServidor} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) =>
                        setForm({ ...form, nome: e.target.value })
                      }
                      placeholder="Nome completo"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matricula</Label>
                    <Input
                      id="matricula"
                      value={form.matricula}
                      onChange={(e) =>
                        setForm({ ...form, matricula: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={form.telefone}
                      onChange={(e) =>
                        setForm({ ...form, telefone: e.target.value })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Secretaria</Label>

                    <Select
                      value={form.secretaria_id}
                      onValueChange={(value) =>
                        setForm({ ...form, secretaria_id: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>

                      <SelectContent>
                        {secretarias.map((secretaria) => (
                          <SelectItem
                            key={secretaria.id}
                            value={secretaria.id}
                          >
                            {secretaria.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    disabled={!form.nome.trim()}
                  >
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabela para computador */}
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Matricula</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Secretaria</th>
                <th className="p-3 text-left">Acesso</th>
                {isAdmin && (
                  <th className="p-3 text-right">Acoes</th>
                )}
              </tr>
            </thead>

            <tbody>
              {servidores.map((servidor) => (
                <tr key={servidor.id} className="border-t">
                  <td className="p-3 font-medium">
                    {servidor.nome}
                  </td>

                  <td className="p-3 font-mono text-xs">
                    {servidor.matricula || "-"}
                  </td>

                  <td className="p-3">
                    {servidor.telefone || "-"}
                  </td>

                  <td className="p-3">
                    {servidor.secretaria_nome || "-"}
                  </td>

                  <td className="p-3">
                    <AccessBadge
                      administrador={servidor.administrador}
                    />
                  </td>

                  {isAdmin && (
                    <td className="p-3 text-right">
                      {!servidor.administrador && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerServidor(servidor.id)}
                          aria-label="Remover servidor"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {servidores.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Nenhum servidor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cartoes para celular */}
      <div className="grid min-w-0 gap-3 md:hidden">
        {servidores.map((servidor) => (
          <Card key={servidor.id} className="min-w-0 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
                {servidor.administrador ? (
                  <Crown className="h-5 w-5" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">
                  {servidor.nome}
                </p>

                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {servidor.secretaria_nome || "Sem secretaria"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Matricula: {servidor.matricula || "Sem matricula"}
                </p>

                {servidor.telefone && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Telefone: {servidor.telefone}
                  </p>
                )}

                <div className="mt-3">
                  <AccessBadge
                    administrador={servidor.administrador}
                  />
                </div>
              </div>

              {isAdmin && !servidor.administrador && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => removerServidor(servidor.id)}
                  aria-label={`Remover ${servidor.nome}`}
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              )}
            </div>
          </Card>
        ))}

        {servidores.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum servidor cadastrado.
          </Card>
        )}
      </div>
    </div>
  );
}

function AccessBadge({
  administrador,
}: {
  administrador: boolean;
}) {
  if (administrador) {
    return (
      <Badge className="bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/20">
        <Crown className="mr-1 h-3 w-3" />
        Administrador
      </Badge>
    );
  }

  return <Badge variant="outline">Sem acesso ao sistema</Badge>;
}
