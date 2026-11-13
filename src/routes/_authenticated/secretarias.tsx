
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/secretarias")({
  component: SecretariasPage,
});

function SecretariasPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdmin;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", sigla: "" });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias-full"],
    queryFn: async () => {
      const response = await apiRequest<any>("/secretarias");
      return response.data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiRequest(`/secretarias/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: form.nome,
            sigla: form.sigla || null,
          }),
        });
      } else {
        await apiRequest("/secretarias", {
          method: "POST",
          body: JSON.stringify({
            nome: form.nome,
            sigla: form.sigla || null,
          }),
        });
      }
    },

    onSuccess: () => {
      toast.success(
        editing ? "Secretaria atualizada" : "Secretaria cadastrada",
      );

      qc.invalidateQueries({ queryKey: ["secretarias-full"] });
      qc.invalidateQueries({ queryKey: ["secretarias"] });

      setOpen(false);
      setEditing(null);
      setForm({ nome: "", sigla: "" });
    },

    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/secretarias/${id}`, {
        method: "DELETE",
      });
    },

    onSuccess: () => {
      toast.success("Secretaria removida");
      qc.invalidateQueries({ queryKey: ["secretarias-full"] });
      qc.invalidateQueries({ queryKey: ["secretarias"] });
    },

    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm({ nome: "", sigla: "" });
    setOpen(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({
      nome: s.nome,
      sigla: s.sigla ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* CABECALHO */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Secretarias
          </h1>
          <p className="text-sm text-muted-foreground">
            Orgaos da prefeitura
          </p>
        </div>

        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full sm:w-auto"
                onClick={openNew}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova secretaria
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[calc(100%-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar" : "Cadastrar"} secretaria
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  if (form.nome.trim() && !saveMut.isPending) {
                    saveMut.mutate();
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) =>
                      setForm({ ...form, nome: e.target.value })
                    }
                    placeholder="Secretaria de Saude"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <Label>Sigla</Label>
                  <Input
                    value={form.sigla}
                    onChange={(e) =>
                      setForm({ ...form, sigla: e.target.value })
                    }
                    placeholder="SMS"
                  />
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
                    disabled={!form.nome.trim() || saveMut.isPending}
                  >
                    {saveMut.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* LISTA DE SECRETARIAS */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {(secretarias ?? []).map((s: any) => (
          <Card
            key={s.id}
            className="min-w-0 p-4 sm:p-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue sm:h-12 sm:w-12">
                <Building2 className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="break-words font-semibold">
                  {s.nome}
                </h3>

                {s.sigla && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {s.sigla}
                  </p>
                )}
              </div>

              {podeEditar && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => openEdit(s)}
                    aria-label={`Editar ${s.nome}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={delMut.isPending}
                    onClick={() => {
                      if (confirm(`Excluir "${s.nome}"?`)) {
                        delMut.mutate(s.id);
                      }
                    }}
                    aria-label={`Excluir ${s.nome}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {(secretarias ?? []).length === 0 && (
          <Card className="col-span-full p-6 text-center text-muted-foreground sm:p-8">
            Nenhuma secretaria cadastrada.
          </Card>
        )}
      </div>
    </div>
  );
}
