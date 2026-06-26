import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Wrench, MapPin, Gauge, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: "blue" | "green" | "orange" | "purple";
  href: string;
  hint: string;
}) {
  const bg = {
    blue: "bg-brand-blue/10 text-brand-blue",
    green: "bg-brand-green/10 text-brand-green",
    orange: "bg-brand-orange/10 text-brand-orange",
    purple: "bg-brand-purple/10 text-brand-purple",
  }[color];
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${bg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-bold leading-tight">{value}</p>
        </div>
      </div>
      <Link to={href} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
        {hint} <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [veiculos, viagens] = await Promise.all([
        supabase.from("veiculos").select("id,status"),
        supabase.from("viagens").select("id,status,km_saida,km_retorno,hora_saida"),
      ]);
      const v = veiculos.data ?? [];
      const t = viagens.data ?? [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hojeMs = today.getTime();
      return {
        disponiveis: v.filter((x) => x.status === "disponivel").length,
        emUso: v.filter((x) => x.status === "em_uso").length,
        manutencao: v.filter((x) => x.status === "em_manutencao").length,
        viagensHoje: t.filter((x) => new Date(x.hora_saida).getTime() >= hojeMs).length,
        kmRodadosMes: t
          .filter((x) => x.status === "finalizada" && x.km_retorno != null)
          .reduce((acc, x) => acc + ((x.km_retorno ?? 0) - x.km_saida), 0),
      };
    },
  });

  const { data: ultimas } = useQuery({
    queryKey: ["ultimas-viagens"],
    queryFn: async () => {
      const { data } = await supabase
        .from("viagens")
        .select("id,numero,hora_saida,origem,destino,status,km_saida,km_retorno, veiculos(placa,modelo), secretarias(nome)")
        .order("hora_saida", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da frota municipal</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Veículos Disponíveis" value={String(stats?.disponiveis ?? 0).padStart(2, "0")} icon={Car} color="blue" href="/veiculos" hint="Ver veículos" />
        <KpiCard label="Veículos em Uso" value={String(stats?.emUso ?? 0).padStart(2, "0")} icon={Car} color="green" href="/viagens" hint="Ver viagens" />
        <KpiCard label="Em Manutenção" value={String(stats?.manutencao ?? 0).padStart(2, "0")} icon={Wrench} color="orange" href="/veiculos" hint="Ver manutenção" />
        <KpiCard label="Viagens Hoje" value={String(stats?.viagensHoje ?? 0).padStart(2, "0")} icon={MapPin} color="purple" href="/viagens" hint="Ver viagens" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                KM Rodados (Total Finalizado)
              </p>
              <p className="text-3xl font-bold leading-tight">
                {(stats?.kmRodadosMes ?? 0).toLocaleString("pt-BR")} km
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Últimas Viagens</h2>
          <Link to="/viagens" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nº</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Veículo</th>
                <th className="text-left p-3 hidden md:table-cell">Secretaria</th>
                <th className="text-left p-3 hidden lg:table-cell">Origem / Destino</th>
                <th className="text-right p-3 hidden sm:table-cell">KM</th>
                <th className="text-right p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(ultimas ?? []).map((v: any) => {
                const km = v.km_retorno != null ? v.km_retorno - v.km_saida : null;
                return (
                  <tr key={v.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">
                      {String(v.numero).padStart(6, "0")}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {format(new Date(v.hora_saida), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{v.veiculos?.modelo}</div>
                      <div className="text-xs text-muted-foreground">{v.veiculos?.placa}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell">{v.secretarias?.nome ?? "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-xs">
                      {v.origem} → {v.destino}
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                      {km != null ? `${km} km` : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Badge
                        variant={v.status === "finalizada" ? "secondary" : "default"}
                        className={
                          v.status === "finalizada"
                            ? "bg-brand-green/15 text-brand-green hover:bg-brand-green/20"
                            : v.status === "em_andamento"
                            ? "bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20"
                            : ""
                        }
                      >
                        {v.status === "finalizada"
                          ? "Finalizada"
                          : v.status === "em_andamento"
                          ? "Em andamento"
                          : "Cancelada"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {(ultimas ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma viagem registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}