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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wrench, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  component: ManutencoesPage,
});

type Status = "aberta" | "em_andamento" | "concluida" | "cancelada";

function ManutencoesPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdminOrGestor;
  const podeExcluir = me?.role === "administrador";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const buscaDeb = useDebounced(busca, 300);
  const [excluir, setExcluir] = useState<{ id: string; label: string } | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["manutencoes", { q: buscaDeb, status: filtroStatus, page, pageSize }],
    queryFn: async () => {
      let q = supabase
        .from("manutencoes")
        .select("*, veiculos!inner(placa,modelo)", { count: "exact" })
        .order("data_abertura", { ascending: false });
      if (filtroStatus !== "todos") q = q.eq("status", filtroStatus as any);
      const s = buscaDeb.trim();
      if (s) {
        const like = `%${s}%`;
        q = q.or(`descricao.ilike.${like},oficina.ilike.${like}`);
      }
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count } = await q;
      return { rows: data ?? [], total: count ?? 0 };
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

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manutencoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manutenção excluída");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      setExcluir(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setExcluir(null);
    },
  });

  const filtradas = Array.isArray(rows) ? [] : (rows?.rows ?? []);
  const total = Array.isArray(rows) ? 0 : (rows?.total ?? 0);

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

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por veículo, descrição ou oficina"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(0); }}
            className="pl-8"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => { setFiltroStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{total} resultado(s)</span>
      </Card>

      <div className="grid gap-3">
        {filtradas.map((m: any) => (
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
              {podeExcluir && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setExcluir({ id: m.id, label: `${m.veiculos?.placa} · ${m.descricao?.slice(0, 40)}` })}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filtradas.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            {total === 0 && !buscaDeb && filtroStatus === "todos" ? "Nenhuma manutenção registrada." : "Nenhum resultado para esses filtros."}
          </Card>
        )}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro <strong>{excluir?.label}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluir && deleteMut.mutate(excluir.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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