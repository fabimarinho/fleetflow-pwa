import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Camera, MapPin, Gauge, Clock, User } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/viagens/$id")({
  component: ViagemDetail,
});

function ViagemDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<File | null>(null);

  const { data: v } = useQuery({
    queryKey: ["viagem", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("viagens")
        .select("*, veiculos(placa,modelo,id,km_atual), secretarias(nome), profiles:motorista_id(nome)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    km_retorno: "",
    combustivel: "",
    ocorrencias: "",
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      if (!v) throw new Error("Viagem não encontrada");
      const kmRet = Number(form.km_retorno);
      if (kmRet < v.km_saida) throw new Error("Km de retorno deve ser maior que km de saída");
      let foto_url: string | null = null;
      if (foto) {
        const path = `hodometro/${v.motorista_id}/${Date.now()}-${foto.name}`;
        const up = await supabase.storage.from("frota").upload(path, foto);
        if (up.error) throw up.error;
        foto_url = up.data.path;
      }
      const { error } = await supabase
        .from("viagens")
        .update({
          km_retorno: kmRet,
          combustivel: form.combustivel || null,
          ocorrencias: form.ocorrencias || null,
          foto_hodometro_retorno_url: foto_url,
          hora_chegada: new Date().toISOString(),
          status: "finalizada",
        })
        .eq("id", id);
      if (error) throw error;
      if (v.veiculos?.id) {
        await supabase.from("veiculos").update({ status: "disponivel", km_atual: kmRet }).eq("id", v.veiculos.id);
      }
    },
    onSuccess: () => {
      toast.success("Viagem finalizada");
      qc.invalidateQueries({ queryKey: ["viagem", id] });
      qc.invalidateQueries({ queryKey: ["viagens-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate({ to: "/viagens" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!v) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  const km = v.km_retorno != null ? v.km_retorno - v.km_saida : null;
  const minutos = v.hora_chegada ? differenceInMinutes(new Date(v.hora_chegada), new Date(v.hora_saida)) : null;
  const isAndamento = v.status === "em_andamento";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/viagens"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">Viagem #{String(v.numero).padStart(6, "0")}</p>
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {isAndamento ? "Retorno" : "Detalhes"}
          </h1>
        </div>
        <Badge
          className={
            v.status === "finalizada"
              ? "bg-brand-green/15 text-brand-green hover:bg-brand-green/20"
              : "bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20"
          }
        >
          {v.status === "finalizada" ? "Finalizada" : "Em andamento"}
        </Badge>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow icon={MapPin} label="Trajeto" value={`${v.origem} → ${v.destino}`} />
          <InfoRow icon={User} label="Motorista" value={v.profiles?.nome ?? "—"} />
          <InfoRow icon={Gauge} label="Veículo" value={`${v.veiculos?.modelo} · ${v.veiculos?.placa}`} />
          <InfoRow icon={Clock} label="Saída" value={format(new Date(v.hora_saida), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
          {v.hora_chegada && (
            <InfoRow icon={Clock} label="Chegada" value={format(new Date(v.hora_chegada), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
          )}
          <InfoRow icon={Gauge} label="Km saída" value={`${v.km_saida.toLocaleString("pt-BR")} km`} />
          {v.km_retorno != null && (
            <InfoRow icon={Gauge} label="Km retorno" value={`${v.km_retorno.toLocaleString("pt-BR")} km`} />
          )}
          {km != null && (
            <InfoRow icon={Gauge} label="Km rodado" value={`${km} km`} highlight />
          )}
          {minutos != null && (
            <InfoRow icon={Clock} label="Tempo" value={`${Math.floor(minutos / 60)}h ${minutos % 60}min`} highlight />
          )}
          {v.secretarias?.nome && <InfoRow icon={User} label="Secretaria" value={v.secretarias.nome} />}
          {v.objetivo && <InfoRow icon={MapPin} label="Objetivo" value={v.objetivo} />}
          {v.ocorrencias && <InfoRow icon={MapPin} label="Ocorrências" value={v.ocorrencias} />}
        </div>
      </Card>

      {isAndamento && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Finalizar viagem</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Km retorno *</Label>
              <Input type="number" value={form.km_retorno} onChange={(e) => setForm({ ...form, km_retorno: e.target.value })} placeholder={String(v.km_saida)} />
            </div>
            <div className="space-y-1">
              <Label>Combustível</Label>
              <Select value={form.combustivel} onValueChange={(val) => setForm({ ...form, combustivel: val })}>
                <SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheio">Cheio</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="1/2">1/2</SelectItem>
                  <SelectItem value="1/4">1/4</SelectItem>
                  <SelectItem value="reserva">Reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label>Ocorrências</Label>
              <Textarea rows={2} value={form.ocorrencias} onChange={(e) => setForm({ ...form, ocorrencias: e.target.value })} placeholder="Nenhuma ocorrência." />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-1">
              <Label>Foto do hodômetro</Label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                {foto ? foto.name.slice(0, 30) : "Tirar/anexar foto"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button asChild variant="outline"><Link to="/viagens">Cancelar</Link></Button>
            <Button
              className="bg-brand-green hover:bg-brand-green/90 text-white"
              disabled={!form.km_retorno || finalizar.isPending}
              onClick={() => finalizar.mutate()}
            >
              {finalizar.isPending ? "Finalizando..." : "FINALIZAR VIAGEM"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={highlight ? "font-semibold text-foreground" : "text-foreground"}>{value}</p>
      </div>
    </div>
  );
}