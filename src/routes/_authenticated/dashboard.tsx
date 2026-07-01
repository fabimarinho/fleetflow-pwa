import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Wrench, MapPin, Gauge, ArrowRight, AlertTriangle } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { computeAlertas } from "@/lib/alertas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [meses, setMeses] = useState<number>(6);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [veiculos, viagens] = await Promise.all([
        supabase.from("veiculos").select("*"),
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
        alertas: computeAlertas(v),
        totalViagens: t.length,
        finalizadas: t.filter((x) => x.status === "finalizada").length,
        emAndamento: t.filter((x) => x.status === "em_andamento").length,
        canceladas: t.filter((x) => x.status === "cancelada").length,
      };
    },
  });

  const { data: kmPorMes } = useQuery({
    queryKey: ["km-por-mes", meses],
    queryFn: async () => {
      const inicio = startOfMonth(subMonths(new Date(), meses - 1)).toISOString();
      const { data } = await supabase
        .from("viagens")
        .select("hora_saida,km_saida,km_retorno,status")
        .gte("hora_saida", inicio)
        .eq("status", "finalizada");
      const buckets: Record<string, number> = {};
      for (let i = meses - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        buckets[format(d, "MM/yy")] = 0;
      }
      for (const r of data ?? []) {
        if (r.km_retorno == null) continue;
        const k = format(new Date(r.hora_saida), "MM/yy");
        if (k in buckets) buckets[k] += r.km_retorno - r.km_saida;
      }
      return Object.entries(buckets).map(([mes, km]) => ({ mes, km }));
    },
  });

  const { data: custoVeic } = useQuery({
    queryKey: ["custo-por-veiculo", meses],
    queryFn: async () => {
      const inicio = startOfMonth(subMonths(new Date(), meses - 1)).toISOString();
      const [ab, mt] = await Promise.all([
        supabase
          .from("abastecimentos")
          .select("valor_total,veiculos(modelo,placa)")
          .gte("data", inicio),
        supabase
          .from("manutencoes")
          .select("custo,veiculos(modelo,placa)")
          .gte("data_abertura", inicio),
      ]);
      const map = new Map<string, { veiculo: string; abast: number; manut: number }>();
      for (const r of ab.data ?? []) {
        const v = (r as any).veiculos;
        if (!v) continue;
        const key = `${v.modelo} ${v.placa}`;
        const cur = map.get(key) ?? { veiculo: key, abast: 0, manut: 0 };
        cur.abast += Number(r.valor_total || 0);
        map.set(key, cur);
      }
      for (const r of mt.data ?? []) {
        const v = (r as any).veiculos;
        if (!v) continue;
        const key = `${v.modelo} ${v.placa}`;
        const cur = map.get(key) ?? { veiculo: key, abast: 0, manut: 0 };
        cur.manut += Number(r.custo || 0);
        map.set(key, cur);
      }
      return Array.from(map.values())
        .sort((a, b) => b.abast + b.manut - (a.abast + a.manut))
        .slice(0, 6);
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da frota municipal</p>
        </div>
        <Select value={String(meses)} onValueChange={(v) => setMeses(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Veículos Disponíveis" value={String(stats?.disponiveis ?? 0).padStart(2, "0")} icon={Car} color="blue" href="/veiculos" hint="Ver veículos" />
        <KpiCard label="Veículos em Uso" value={String(stats?.emUso ?? 0).padStart(2, "0")} icon={Car} color="green" href="/viagens" hint="Ver viagens" />
        <KpiCard label="Em Manutenção" value={String(stats?.manutencao ?? 0).padStart(2, "0")} icon={Wrench} color="orange" href="/veiculos" hint="Ver manutenção" />
        <KpiCard label="Viagens Hoje" value={String(stats?.viagensHoje ?? 0).padStart(2, "0")} icon={MapPin} color="purple" href="/viagens" hint="Ver viagens" />
      </div>

      {(stats?.alertas?.length ?? 0) > 0 && (
        <Card className="p-5 border-brand-orange/40">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold">Alertas e vencimentos ({stats?.alertas.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats!.alertas.slice(0, 9).map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full ${
                    a.severidade === "alta"
                      ? "bg-brand-red"
                      : a.severidade === "media"
                        ? "bg-brand-orange"
                        : "bg-brand-blue"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {a.label} — {a.veiculo} <span className="text-muted-foreground">({a.placa})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.detalhe}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Km rodados por mês</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmPorMes ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("pt-BR")} km`} />
                <Bar dataKey="km" fill="hsl(var(--brand-blue))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Situação das viagens</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Finalizadas", value: stats?.finalizadas ?? 0, color: "hsl(var(--brand-green))" },
                    { name: "Em andamento", value: stats?.emAndamento ?? 0, color: "hsl(var(--brand-orange))" },
                    { name: "Canceladas", value: stats?.canceladas ?? 0, color: "hsl(var(--muted-foreground))" },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {[
                    "hsl(var(--brand-green))",
                    "hsl(var(--brand-orange))",
                    "hsl(var(--muted-foreground))",
                  ].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Custo por veículo (abastecimento + manutenção)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={custoVeic ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="veiculo" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="abast" name="Abastecimento" stackId="c" fill="hsl(var(--brand-blue))" />
                <Bar dataKey="manut" name="Manutenção" stackId="c" fill="hsl(var(--brand-orange))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
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