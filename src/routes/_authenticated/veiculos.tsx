import { createFileRoute } from "@tanstack/react-router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
};

function VeiculosPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdminOrGestor;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculos")
        .select("*, secretarias(nome)")
        .order("modelo");
      return data ?? [];
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const [form, setForm] = useState({
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
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("veiculos").insert({
        placa: form.placa.toUpperCase(),
        modelo: form.modelo,
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo cadastrado");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setOpen(false);
      setForm({ placa: "", modelo: "", marca: "", ano: "", tipo: "", km_atual: "0", secretaria_id: "", status: "disponivel", proximo_oleo_km: "", licenciamento_ate: "", ipva_ate: "", seguro_ate: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar veículo</DialogTitle>
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
                <Button disabled={!form.placa || !form.modelo || createMut.isPending} onClick={() => createMut.mutate()}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(veiculos ?? []).map((v: any) => (
          <Card key={v.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                v.status === "em_manutencao" ? "bg-brand-orange/10 text-brand-orange" :
                v.status === "em_uso" ? "bg-brand-green/10 text-brand-green" :
                "bg-brand-blue/10 text-brand-blue"
              }`}>
                {v.status === "em_manutencao" ? <Wrench className="h-6 w-6" /> : <Car className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{v.modelo}</h3>
                <p className="text-xs text-muted-foreground">{v.marca} {v.ano ? `· ${v.ano}` : ""}</p>
                <p className="font-mono text-sm mt-1">{v.placa}</p>
              </div>
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
        {(veiculos ?? []).length === 0 && (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            Nenhum veículo cadastrado{podeEditar ? " ainda. Clique em \"Novo veículo\" para começar." : "."}
          </Card>
        )}
      </div>
    </div>
  );
}