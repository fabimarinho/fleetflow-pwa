import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, ArrowRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/viagens/")({
  component: ViagensList,
});

function ViagensList() {
  const [q, setQ] = useState("");

  const { data: viagens } = useQuery({
    queryKey: ["viagens-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("viagens")
        .select("*, veiculos(placa,modelo), secretarias(nome), profiles!viagens_motorista_profile_fkey(nome)")
        .order("hora_saida", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const filtered = (viagens ?? []).filter((v: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      v.veiculos?.placa?.toLowerCase().includes(s) ||
      v.veiculos?.modelo?.toLowerCase().includes(s) ||
      v.origem?.toLowerCase().includes(s) ||
      v.destino?.toLowerCase().includes(s) ||
      v.profiles?.nome?.toLowerCase().includes(s) ||
      v.secretarias?.nome?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Viagens</h1>
          <p className="text-sm text-muted-foreground">Histórico de viagens</p>
        </div>
        <Button asChild>
          <Link to="/viagens/nova"><Plus className="mr-2 h-4 w-4" /> Nova viagem</Link>
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por placa, motorista, secretaria ou destino..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      {/* Desktop table */}
      <Card className="p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nº</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Veículo</th>
                <th className="text-left p-3">Motorista</th>
                <th className="text-left p-3">Secretaria</th>
                <th className="text-left p-3">Origem / Destino</th>
                <th className="text-right p-3">KM</th>
                <th className="text-right p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any) => {
                const km = v.km_retorno != null ? v.km_retorno - v.km_saida : null;
                return (
                  <tr key={v.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{String(v.numero).padStart(6, "0")}</td>
                    <td className="p-3 whitespace-nowrap">{format(new Date(v.hora_saida), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                    <td className="p-3">
                      <div className="font-medium">{v.veiculos?.modelo}</div>
                      <div className="text-xs text-muted-foreground font-mono">{v.veiculos?.placa}</div>
                    </td>
                    <td className="p-3">{v.profiles?.nome ?? "—"}</td>
                    <td className="p-3">{v.secretarias?.nome ?? "—"}</td>
                    <td className="p-3 text-xs">{v.origem} → {v.destino}</td>
                    <td className="p-3 text-right whitespace-nowrap">{km != null ? `${km} km` : "—"}</td>
                    <td className="p-3 text-right">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/viagens/$id" params={{ id: v.id }}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma viagem encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((v: any) => {
          const km = v.km_retorno != null ? v.km_retorno - v.km_saida : null;
          return (
            <Link key={v.id} to="/viagens/$id" params={{ id: v.id }}>
              <Card className="p-4 active:scale-[0.99] transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-purple/10 text-brand-purple">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">#{String(v.numero).padStart(6, "0")}</p>
                      <p className="font-medium truncate">{v.veiculos?.modelo} · {v.veiculos?.placa}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.origem} → {v.destino}</p>
                    </div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(v.hora_saida), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                  <span>{km != null ? `${km} km` : "Em andamento"}</span>
                </div>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground text-sm">Nenhuma viagem.</Card>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "finalizada") {
    return <Badge className="bg-brand-green/15 text-brand-green hover:bg-brand-green/20">Finalizada</Badge>;
  }
  if (status === "em_andamento") {
    return <Badge className="bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20">Em andamento</Badge>;
  }
  return <Badge variant="outline">Cancelada</Badge>;
}