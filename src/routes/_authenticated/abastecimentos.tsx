import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Fuel, Plus, Camera } from "lucide-react";
import { useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/abastecimentos")({
  component: AbastecimentosPage,
});

const COMBUSTIVEIS: { value: string; label: string }[] = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_s10", label: "Diesel S10" },
  { value: "gnv", label: "GNV" },
  { value: "flex", label: "Flex" },
];

function AbastecimentosPage() {
  const { data: me } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cupom, setCupom] = useState<File | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["abastecimentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("abastecimentos")
        .select("*, veiculos(placa,modelo), secretarias(nome), profiles:motorista_id(nome)")
        .order("data", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-all"],
    queryFn: async () =>
      (await supabase.from("veiculos").select("*").order("modelo")).data ?? [],
  });
  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () =>
      (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const [form, setForm] = useState({
    veiculo_id: "",
    secretaria_id: "",
    tipo_combustivel: "gasolina",
    km: "",
    litros: "",
    valor_litro: "",
    posto: "",
    observacoes: "",
  });

  const total =
    Number(form.litros || 0) * Number(form.valor_litro || 0) || 0;

  const createMut = useMutation({
    mutationFn: async () => {
      if (!me?.user) throw new Error("Sem usuário");
      let cupom_url: string | null = null;
      if (cupom) {
        const path = `cupons/${me.user.id}/${Date.now()}-${cupom.name}`;
        const up = await supabase.storage.from("frota").upload(path, cupom);
        if (up.error) throw up.error;
        cupom_url = up.data.path;
      }
      const { error } = await supabase.from("abastecimentos").insert({
        veiculo_id: form.veiculo_id,
        motorista_id: me.user.id,
        secretaria_id: form.secretaria_id || null,
        tipo_combustivel: form.tipo_combustivel as any,
        km: Number(form.km),
        litros: Number(form.litros),
        valor_litro: Number(form.valor_litro),
        valor_total: total,
        posto: form.posto || null,
        observacoes: form.observacoes || null,
        cupom_url,
      });
      if (error) throw error;
      // bump vehicle km if higher
      const sel = veiculos?.find((v) => v.id === form.veiculo_id);
      if (sel && Number(form.km) > (sel.km_atual ?? 0)) {
        await supabase
          .from("veiculos")
          .update({ km_atual: Number(form.km) })
          .eq("id", form.veiculo_id);
      }
    },
    onSuccess: () => {
      toast.success("Abastecimento registrado");
      qc.invalidateQueries({ queryKey: ["abastecimentos"] });
      setOpen(false);
      setCupom(null);
      setForm({
        veiculo_id: "",
        secretaria_id: "",
        tipo_combustivel: "gasolina",
        km: "",
        litros: "",
        valor_litro: "",
        posto: "",
        observacoes: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abastecimentos</h1>
          <p className="text-sm text-muted-foreground">
            Controle de combustível por veículo
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo abastecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar abastecimento</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Veículo *</Label>
                <Select
                  value={form.veiculo_id}
                  onValueChange={(v) => {
                    const sel = veiculos?.find((x) => x.id === v);
                    setForm({
                      ...form,
                      veiculo_id: v,
                      km: sel ? String(sel.km_atual ?? 0) : "",
                    });
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
                <Label>Combustível *</Label>
                <Select
                  value={form.tipo_combustivel}
                  onValueChange={(v) => setForm({ ...form, tipo_combustivel: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMBUSTIVEIS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Km *</Label>
                <Input
                  type="number"
                  value={form.km}
                  onChange={(e) => setForm({ ...form, km: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Litros *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.litros}
                  onChange={(e) => setForm({ ...form, litros: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor por litro (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_litro}
                  onChange={(e) =>
                    setForm({ ...form, valor_litro: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Total</Label>
                <Input disabled value={`R$ ${total.toFixed(2)}`} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Posto</Label>
                <Input
                  value={form.posto}
                  onChange={(e) => setForm({ ...form, posto: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Secretaria</Label>
                <Select
                  value={form.secretaria_id}
                  onValueChange={(v) => setForm({ ...form, secretaria_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(secretarias ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Foto do cupom</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setCupom(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {cupom ? cupom.name.slice(0, 28) : "Anexar foto do cupom"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={
                  !form.veiculo_id ||
                  !form.km ||
                  !form.litros ||
                  !form.valor_litro ||
                  createMut.isPending
                }
                onClick={() => createMut.mutate()}
                className="bg-brand-green hover:bg-brand-green/90 text-white"
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* desktop */}
      <Card className="p-0 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Veículo</th>
              <th className="text-left p-3">Motorista</th>
              <th className="text-left p-3">Combustível</th>
              <th className="text-right p-3">Km</th>
              <th className="text-right p-3">Litros</th>
              <th className="text-right p-3">R$/L</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap">
                  {format(new Date(r.data), "dd/MM/yy HH:mm", { locale: ptBR })}
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.veiculos?.modelo}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {r.veiculos?.placa}
                  </div>
                </td>
                <td className="p-3">{r.profiles?.nome ?? "—"}</td>
                <td className="p-3 capitalize">
                  {String(r.tipo_combustivel).replace("_", " ")}
                </td>
                <td className="p-3 text-right">
                  {r.km?.toLocaleString("pt-BR")}
                </td>
                <td className="p-3 text-right">{Number(r.litros).toFixed(2)}</td>
                <td className="p-3 text-right">
                  R$ {Number(r.valor_litro).toFixed(2)}
                </td>
                <td className="p-3 text-right font-semibold">
                  R$ {Number(r.valor_total).toFixed(2)}
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum abastecimento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* mobile */}
      <div className="grid gap-3 md:hidden">
        {(rows ?? []).map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
                <Fuel className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {r.veiculos?.modelo} · {r.veiculos?.placa}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.data), "dd/MM/yy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  R$ {Number(r.valor_total).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Number(r.litros).toFixed(2)} L
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}