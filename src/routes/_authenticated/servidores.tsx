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

    const adminName = me?.profile?.nome || me?.user?.email || "Usuario teste";
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
    const secretaria = secretarias.find((s) => s.id === form.secretaria_id);
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
    setServidores((current) => current.filter((item) => item.id !== id));
    toast.success("Servidor removido");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servidores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro simples para uso local. Somente o administrador edita.
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
              <form onSubmit={salvarServidor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome completo"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="matricula">Matricula</Label>
                    <Input
                      id="matricula"
                      value={form.matricula}
                      onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Secretaria</Label>
                    <Select
                      value={form.secretaria_id}
                      onValueChange={(value) => setForm({ ...form, secretaria_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {secretarias.map((secretaria) => (
                          <SelectItem key={secretaria.id} value={secretaria.id}>
                            {secretaria.nome}
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
                  <Button type="submit" disabled={!form.nome.trim()}>
                    Cadastrar
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
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Matricula</th>
              <th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Secretaria</th>
              <th className="text-left p-3">Acesso</th>
              {isAdmin && <th className="text-right p-3">Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {servidores.map((servidor) => (
              <tr key={servidor.id} className="border-t">
                <td className="p-3 font-medium">{servidor.nome}</td>
                <td className="p-3 font-mono text-xs">{servidor.matricula || "-"}</td>
                <td className="p-3">{servidor.telefone || "-"}</td>
                <td className="p-3">{servidor.secretaria_nome || "-"}</td>
                <td className="p-3">
                  <AccessBadge administrador={servidor.administrador} />
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
          </tbody>
        </table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {servidores.map((servidor) => (
          <Card key={servidor.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
                {servidor.administrador ? (
                  <Crown className="h-5 w-5" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{servidor.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {servidor.secretaria_nome || "Sem secretaria"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {servidor.matricula || "Sem matricula"} {servidor.telefone ? `- ${servidor.telefone}` : ""}
                </p>
              </div>
              <AccessBadge administrador={servidor.administrador} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AccessBadge({ administrador }: { administrador: boolean }) {
  if (administrador) {
    return (
      <Badge className="bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/20">
        <Crown className="mr-1 h-3 w-3" /> Administrador
      </Badge>
    );
  }
  return <Badge variant="outline">Sem acesso ao sistema</Badge>;
}
