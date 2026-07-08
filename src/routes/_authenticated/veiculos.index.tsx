import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Plus, Wrench, Search, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { z } from "zod";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/veiculos/")({
  component: VeiculosPage,
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
};

const emptyForm = {
  placa: "",
  modelo: "",
  marca: "",
  ano: "",
  tipo: "",
  km_atual: "0",
  secretaria_id: "",
  status: "disponivel" as "disponivel" | "em_uso" | "em_manutencao",
  proximo_oleo_km: "",
  licenciamento_ate: "",
  ipva_ate: "",
  seguro_ate: "",
};

const veiculoSchema = z.object({
  placa: z.string().trim().min(5, "Placa inválida").max(10, "Placa inválida"),
  modelo: z.string().trim().min(1, "Informe o modelo").max(80),
  ano: z.string().refine((v) => v === "" || (Number(v) >= 1900 && Number(v) <= new Date().getFullYear() + 1), "Ano inválido"),
  km_atual: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Km inválido"),
});

function VeiculosPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdminOrGestor;
  const podeExcluir = me?.role === "administrador";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const buscaDeb = useDebounced(busca, 300);
  const [excluir, setExcluir] = useState<{ id: string; label: string } | null>(null);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos", { q: buscaDeb, status: filtroStatus, page, pageSize }],
    queryFn: async () => {
      let q = supabase
        .from("veiculos")
        .select("*, secretarias(nome)", { count: "exact" })
        .order("modelo");
      if (filtroStatus !== "todos") q = q.eq("status", filtroStatus as any);
      const s = buscaDeb.trim();
      if (s) {
        const like = `%${s}%`;
        q = q.or(`placa.ilike.${like},modelo.ilike.${like},marca.ilike.${like}`);
      }
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count } = await q;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const [form, setForm] = useState(emptyForm);

  function abrirNovo() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function abrirEdicao(v: any) {
    setEditId(v.id);
    setForm({
      placa: v.placa ?? "",
      modelo: v.modelo ?? "",
      marca: v.marca ?? "",
      ano: v.ano ? String(v.ano) : "",
      tipo: v.tipo ?? "",
      km_atual: String(v.km_atual ?? 0),
      secretaria_id: v.secretaria_id ?? "",
      status: v.status ?? "disponivel",
      proximo_oleo_km: v.proximo_oleo_km ? String(v.proximo_oleo_km) : "",
      licenciamento_ate: v.licenciamento_ate ?? "",
      ipva_ate: v.ipva_ate ?? "",
      seguro_ate: v.seguro_ate ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const parsed = veiculoSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const payload = {
        placa: form.placa.toUpperCase().trim(),
        modelo: form.modelo.trim(),
        marca: form.marca || null,
        ano: form.ano ? Number(form.ano) : null,
        tipo: form.tipo || null,
        km_atual: Number(form.km_atual) || 0,
        secretaria_id: form.secretaria_id || null,
        status: form.status,
        proximo_oleo_km: form.proximo_oleo_km ? Number(form.proximo_oleo_km) : null,
        licenciamento_ate: form.licenciamento_ate || null,
        ipva_ate: form.ipva_ate || null,
        seguro_ate: form.seguro_ate || null,
      };
      if (editId) {
        const { error } = await supabase.from("veiculos").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("veiculos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Veículo atualizado" : "Veículo cadastrado");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veiculos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo excluído");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setExcluir(null);
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("foreign") ? "Existem registros vinculados a este veículo." : e.message);
      setExcluir(null);
    },
  });

  const filtrados = veiculos?.rows ?? [];
  const total = veiculos?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Veículos</h1>
          <p className="text-sm text-muted-foreground">Frota cadastrada</p>
        </div>
        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={abrirNovo}>
                <Plus className="mr-2 h-4 w-4" /> Novo veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "Editar veículo" : "Cadastrar veículo"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <Label>Placa *</Label>
                  <Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC-1234" />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <Label>Modelo *</Label>
                  <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Fiat Strada" />
                </div>
                <div className="space-y-1">
                  <Label>Marca</Label>
                  <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Ano</Label>
                  <Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Pickup, Sedan..." />
                </div>
                <div className="space-y-1">
                  <Label>Km atual</Label>
                  <Input type="number" value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Secretaria responsável</Label>
                  <Select value={form.secretaria_id} onValueChange={(v) => setForm({ ...form, secretaria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {(secretarias ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em uso</SelectItem>
                      <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alertas e agenda</p>
                </div>
                <div className="space-y-1">
                  <Label>Próxima troca óleo (km)</Label>
                  <Input type="number" value={form.proximo_oleo_km} onChange={(e) => setForm({ ...form, proximo_oleo_km: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Licenciamento até</Label>
                  <Input type="date" value={form.licenciamento_ate} onChange={(e) => setForm({ ...form, licenciamento_ate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>IPVA até</Label>
                  <Input type="date" value={form.ipva_ate} onChange={(e) => setForm({ ...form, ipva_ate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Seguro até</Label>
                  <Input type="date" value={form.seguro_ate} onChange={(e) => setForm({ ...form, seguro_ate: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button disabled={!form.placa || !form.modelo || saveMut.isPending} onClick={() => saveMut.mutate()}>
                  Salvar
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
            placeholder="Buscar por placa, modelo ou marca"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(0); }}
            className="pl-8"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => { setFiltroStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="em_uso">Em uso</SelectItem>
            <SelectItem value="em_manutencao">Em manutenção</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{total} resultado(s)</span>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((v: any) => (
          <Card key={v.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                v.status === "em_manutencao" ? "bg-brand-orange/10 text-brand-orange" :
                v.status === "em_uso" ? "bg-brand-green/10 text-brand-green" :
                "bg-brand-blue/10 text-brand-blue"
              }`}>
                {v.status === "em_manutencao" ? <Wrench className="h-6 w-6" /> : <Car className="h-6 w-6" />}
              </div>
              <Link to="/veiculos/$id" params={{ id: v.id }} className="min-w-0 flex-1 group">
                <h3 className="font-semibold truncate">{v.modelo}</h3>
                <p className="text-xs text-muted-foreground">{v.marca} {v.ano ? `· ${v.ano}` : ""}</p>
                <p className="font-mono text-sm mt-1 inline-flex items-center gap-1">
                  {v.placa}
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </p>
              </Link>
              {podeEditar && (
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => abrirEdicao(v)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {podeExcluir && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setExcluir({ id: v.id, label: `${v.modelo} · ${v.placa}` })} aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{STATUS_LABEL[v.status]}</Badge>
              <span className="text-muted-foreground">{v.km_atual?.toLocaleString("pt-BR")} km</span>
              {v.secretarias?.nome && (
                <span className="text-muted-foreground">· {v.secretarias.nome}</span>
              )}
            </div>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            {total === 0 && !buscaDeb && filtroStatus === "todos"
              ? `Nenhum veículo cadastrado${podeEditar ? " ainda. Clique em \"Novo veículo\" para começar." : "."}`
              : "Nenhum veículo encontrado com esses filtros."}
          </Card>
        )}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O veículo <strong>{excluir?.label}</strong> será removido permanentemente.
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