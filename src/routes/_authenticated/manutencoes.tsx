import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  component: ManutencoesPage,
});

type Status = "aberta" | "em_andamento" | "concluida" | "cancelada";

function ManutencoesPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdminOrGestor;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rows } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencoes")
        .select("*, veiculos(placa,modelo)")
        .order("data_abertura", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-all"],
    queryFn: async () =>
      (await supabase.from("veiculos").select("*").order("modelo")).data ?? [],
  });

  const [form, setForm] = useState({
    veiculo_id: "",
    tipo: "preventiva" as "preventiva" | "corretiva",
    descricao: "",
    oficina: "",
    km: "",
    custo: "",
    observacoes: "",
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manutencoes").insert({
        veiculo_id: form.veiculo_id,
        tipo: form.tipo,
        descricao: form.descricao,
        oficina: form.oficina || null,
        km: form.km ? Number(form.km) : null,
        custo: form.custo ? Number(form.custo) : null,
        observacoes: form.observacoes || null,
        responsavel_id: me?.user?.id ?? null,
        status: "aberta",
      });
      if (error) throw error;
      // mark vehicle in maintenance
      await supabase
        .from("veiculos")
        .update({ status: "em_manutencao" })
        .eq("id", form.veiculo_id);
    },
    onSuccess: () => {
      toast.success("Manutenção registrada");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setOpen(false);
      setForm({
        veiculo_id: "",
        tipo: "preventiva",
        descricao: "",
        oficina: "",
        km: "",
        custo: "",
        observacoes: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status, veiculoId }: { id: string; status: Status; veiculoId: string }) => {
      const patch: any = { status };
      if (status === "concluida") patch.data_conclusao = new Date().toISOString();
      const { error } = await supabase.from("manutencoes").update(patch).eq("id", id);
      if (error) throw error;
      if (status === "concluida" || status === "cancelada") {
        await supabase.from("veiculos").update({ status: "disponivel" }).eq("id", veiculoId);
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenções</h1>
          <p className="text-sm text-muted-foreground">
            Ordens de serviço preventivas e corretivas
          </p>
        </div>
        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova manutenção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Abrir manutenção</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Veículo *</Label>
                  <Select
                    value={form.veiculo_id}
                    onValueChange={(v) => {
                      const sel = veiculos?.find((x) => x.id === v);
                      setForm({ ...form, veiculo_id: v, km: sel ? String(sel.km_atual ?? 0) : "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(veiculos ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.modelo} · {v.placa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="corretiva">Corretiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Km</Label>
                  <Input type="number" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Descrição *</Label>
                  <Textarea
                    rows={2}
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Troca de óleo e filtros"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Oficina</Label>
                  <Input value={form.oficina} onChange={(e) => setForm({ ...form, oficina: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Custo (R$)</Label>
                  <Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!form.veiculo_id || !form.descricao || createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  Abrir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3">
        {(rows ?? []).map((m: any) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {m.veiculos?.modelo} · {m.veiculos?.placa}
                  </p>
                  <Badge variant="outline" className="capitalize">{m.tipo}</Badge>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-sm mt-1">{m.descricao}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Aberta {format(new Date(m.data_abertura), "dd/MM/yy", { locale: ptBR })}</span>
                  {m.oficina && <span>· {m.oficina}</span>}
                  {m.km != null && <span>· {m.km.toLocaleString("pt-BR")} km</span>}
                  {m.custo != null && <span>· R$ {Number(m.custo).toFixed(2)}</span>}
                </div>
              </div>
              {podeEditar && m.status !== "concluida" && m.status !== "cancelada" && (
                <Select
                  value={m.status}
                  onValueChange={(v: Status) =>
                    statusMut.mutate({ id: m.id, status: v, veiculoId: m.veiculo_id })
                  }
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>
        ))}
        {(rows ?? []).length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhuma manutenção registrada.
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "concluida")
    return <Badge className="bg-brand-green/15 text-brand-green hover:bg-brand-green/20">Concluída</Badge>;
  if (status === "em_andamento")
    return <Badge className="bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20">Em andamento</Badge>;
  if (status === "cancelada") return <Badge variant="outline">Cancelada</Badge>;
  return <Badge className="bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/20">Aberta</Badge>;
}