import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const podeEditar = !!me?.isAdminOrGestor;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", sigla: "" });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias-full"],
    queryFn: async () =>
      (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("secretarias")
          .update({ nome: form.nome, sigla: form.sigla || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("secretarias")
          .insert({ nome: form.nome, sigla: form.sigla || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Secretaria atualizada" : "Secretaria cadastrada");
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
      const { error } = await supabase.from("secretarias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Secretaria removida");
      qc.invalidateQueries({ queryKey: ["secretarias-full"] });
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
    setForm({ nome: s.nome, sigla: s.sigla ?? "" });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Secretarias</h1>
          <p className="text-sm text-muted-foreground">Órgãos da prefeitura</p>
        </div>
        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova secretaria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar" : "Cadastrar"} secretaria</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (form.nome && !saveMut.isPending) saveMut.mutate();
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Secretaria de Saúde"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sigla</Label>
                  <Input
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                    placeholder="SMS"
                  />
                </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!form.nome || saveMut.isPending}
                >
                  Salvar
                </Button>
              </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(secretarias ?? []).map((s: any) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{s.nome}</h3>
                {s.sigla && (
                  <p className="text-xs text-muted-foreground font-mono">{s.sigla}</p>
                )}
              </div>
              {podeEditar && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Excluir "${s.nome}"?`)) delMut.mutate(s.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {(secretarias ?? []).length === 0 && (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            Nenhuma secretaria cadastrada.
          </Card>
        )}
      </div>
    </div>
  );
}