
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Wrench,
  MapPin,
  Gauge,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
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

/**
 * Busca todos os registros de endpoints que usam page/pageSize.
 */
async function buscarTodosPaginados(endpoint: string, pageSize = 100) {
  const primeiraResposta = await apiRequest<any>(
    `${endpoint}?page=0&pageSize=${pageSize}`
  );

  const primeiraPagina = primeiraResposta.data?.rows ?? [];
  const total = Number(
    primeiraResposta.data?.total ?? primeiraPagina.length
  );

  const totalPaginas = Math.ceil(total / pageSize);

  if (totalPaginas <= 1) {
    return primeiraPagina;
  }

  const respostas = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, indice) =>
      apiRequest<any>(
        `${endpoint}?page=${indice + 1}&pageSize=${pageSize}`
      )
    )
  );

  return [
    ...primeiraPagina,
    ...respostas.flatMap((resposta) => resposta.data?.rows ?? []),
  ];
}

/**
 * Busca todas as viagens usando a paginação por limit/offset da API.
 */
async function buscarTodasViagens() {
  const limite = 500;
  const primeiraResposta = await apiRequest<any>(
    `/viagens?limit=${limite}&offset=0`
  );

  const primeiraPagina = primeiraResposta.data ?? [];
  const todas = [...primeiraPagina];

  if (primeiraPagina.length < limite) {
    return todas;
  }

  let offset = limite;

  while (true) {
    const resposta = await apiRequest<any>(
      `/viagens?limit=${limite}&offset=${offset}`
    );

    const pagina = resposta.data ?? [];
    todas.push(...pagina);

    if (pagina.length < limite) {
      break;
    }

    offset += limite;
  }

  return todas;
}

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
      <Link
        to={href}
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        {hint} <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}

function formatarData(data: string | null | undefined) {
  if (!data) return "—";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) return "—";

  return format(valor, "dd/MM/yyyy", { locale: ptBR });
}

function Dashboard() {
  const [meses, setMeses] = useState<number>(6);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [veiculos, viagens] = await Promise.all([
        buscarTodosPaginados("/veiculos"),
        buscarTodasViagens(),
      ]);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const hojeMs = hoje.getTime();
      const amanhaMs = amanha.getTime();

      const viagensFinalizadas = viagens.filter(
        (v: any) =>
          v.status === "finalizada" &&
          v.km_retorno != null
      );

      return {
        disponiveis: veiculos.filter(
          (v: any) => v.status === "disponivel"
        ).length,

        emUso: veiculos.filter(
          (v: any) => v.status === "em_uso"
        ).length,

        manutencao: veiculos.filter(
          (v: any) => v.status === "em_manutencao"
        ).length,

        viagensHoje: viagens.filter((v: any) => {
          const data = new Date(v.hora_saida).getTime();

          return (
            !Number.isNaN(data) &&
            data >= hojeMs &&
            data < amanhaMs
          );
        }).length,

        kmRodadosMes: viagensFinalizadas.reduce(
          (acc: number, v: any) =>
            acc + (Number(v.km_retorno) - Number(v.km_saida)),
          0
        ),

        alertas: computeAlertas(veiculos),

        totalViagens: viagens.length,

        finalizadas: viagens.filter(
          (v: any) => v.status === "finalizada"
        ).length,

        emAndamento: viagens.filter(
          (v: any) => v.status === "em_andamento"
        ).length,

        canceladas: viagens.filter(
          (v: any) => v.status === "cancelada"
        ).length,
      };
    },
  });

  const { data: kmPorMes } = useQuery({
    queryKey: ["km-por-mes", meses],
    queryFn: async () => {
      const inicio = startOfMonth(
        subMonths(new Date(), meses - 1)
      );

      const viagens = await buscarTodasViagens();

      const buckets: Record<string, number> = {};

      for (let i = meses - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        buckets[format(d, "MM/yy")] = 0;
      }

      for (const viagem of viagens) {
        if (
          viagem.status !== "finalizada" ||
          viagem.km_retorno == null ||
          !viagem.hora_saida
        ) {
          continue;
        }

        const dataSaida = new Date(viagem.hora_saida);

        if (
          Number.isNaN(dataSaida.getTime()) ||
          dataSaida < inicio
        ) {
          continue;
        }

        const mes = format(dataSaida, "MM/yy");

        if (mes in buckets) {
          buckets[mes] +=
            Number(viagem.km_retorno) - Number(viagem.km_saida);
        }
      }

      return Object.entries(buckets).map(([mes, km]) => ({
        mes,
        km,
      }));
    },
  });

  const { data: custoVeic } = useQuery({
    queryKey: ["custo-por-veiculo", meses],
    queryFn: async () => {
      const inicio = startOfMonth(
        subMonths(new Date(), meses - 1)
      );

      const agora = new Date();

      const [abastecimentos, manutencoes] = await Promise.all([
        buscarTodosPaginados("/abastecimentos"),
        buscarTodosPaginados("/manutencoes"),
      ]);

      const mapa = new Map<
        string,
        { veiculo: string; abast: number; manut: number }
      >();

      for (const registro of abastecimentos) {
        if (!registro.data) continue;

        const dataRegistro = new Date(registro.data);

        if (
          Number.isNaN(dataRegistro.getTime()) ||
          dataRegistro < inicio ||
          dataRegistro > agora
        ) {
          continue;
        }

        const veiculo = registro.veiculos;
        if (!veiculo) continue;

        const chave = `${veiculo.modelo} ${veiculo.placa}`;

        const atual = mapa.get(chave) ?? {
          veiculo: chave,
          abast: 0,
          manut: 0,
        };

        atual.abast += Number(registro.valor_total || 0);
        mapa.set(chave, atual);
      }

      for (const registro of manutencoes) {
        if (!registro.data_abertura) continue;

        const dataRegistro = new Date(registro.data_abertura);

        if (
          Number.isNaN(dataRegistro.getTime()) ||
          dataRegistro < inicio ||
          dataRegistro > agora
        ) {
          continue;
        }

        const veiculo = registro.veiculos;
        if (!veiculo) continue;

        const chave = `${veiculo.modelo} ${veiculo.placa}`;

        const atual = mapa.get(chave) ?? {
          veiculo: chave,
          abast: 0,
          manut: 0,
        };

        atual.manut += Number(registro.custo || 0);
        mapa.set(chave, atual);
      }

      return Array.from(mapa.values())
        .sort(
          (a, b) =>
            b.abast +
            b.manut -
            (a.abast + a.manut)
        )
        .slice(0, 6);
    },
  });

  const { data: ultimas } = useQuery({
    queryKey: ["ultimas-viagens"],
    queryFn: async () => {
      const viagens = await buscarTodasViagens();

      return viagens
        .sort(
          (a: any, b: any) =>
            new Date(b.hora_saida).getTime() -
            new Date(a.hora_saida).getTime()
        )
        .slice(0, 6);
    },
  });

  const { data: ultimasManutencoes } = useQuery({
    queryKey: ["ultimas-manutencoes-dashboard"],
    queryFn: async () => {
      const manutencoes = await buscarTodosPaginados("/manutencoes");

      return manutencoes
        .sort(
          (a: any, b: any) =>
            new Date(b.data_abertura).getTime() -
            new Date(a.data_abertura).getTime()
        )
        .slice(0, 6);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da frota municipal
          </p>
        </div>

        <Select
          value={String(meses)}
          onValueChange={(v) => setMeses(Number(v))}
        >
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
        <KpiCard
          label="Veículos Disponíveis"
          value={String(stats?.disponiveis ?? 0).padStart(2, "0")}
          icon={Car}
          color="blue"
          href="/veiculos"
          hint="Ver veículos"
        />

        <KpiCard
          label="Veículos em Uso"
          value={String(stats?.emUso ?? 0).padStart(2, "0")}
          icon={Car}
          color="green"
          href="/viagens"
          hint="Ver viagens"
        />

        <KpiCard
          label="Em Manutenção"
          value={String(stats?.manutencao ?? 0).padStart(2, "0")}
          icon={Wrench}
          color="orange"
          href="/veiculos"
          hint="Ver manutenção"
        />

        <KpiCard
          label="Viagens Hoje"
          value={String(stats?.viagensHoje ?? 0).padStart(2, "0")}
          icon={MapPin}
          color="purple"
          href="/viagens"
          hint="Ver viagens"
        />
      </div>

      {(stats?.alertas?.length ?? 0) > 0 && (
        <Card className="p-5 border-brand-orange/40">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold">
              Alertas e vencimentos ({stats?.alertas.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats!.alertas.slice(0, 9).map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border p-2"
              >
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
                    {a.label} — {a.veiculo}{" "}
                    <span className="text-muted-foreground">
                      ({a.placa})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.detalhe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">
            Km rodados por mês
          </h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmPorMes ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(v: number) =>
                    `${v.toLocaleString("pt-BR")} km`
                  }
                />
                <Bar
                  dataKey="km"
                  fill="var(--brand-blue)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">
            Situação das viagens
          </h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Finalizadas",
                      value: stats?.finalizadas ?? 0,
                      color: "var(--brand-green)",
                    },
                    {
                      name: "Em andamento",
                      value: stats?.emAndamento ?? 0,
                      color: "var(--brand-orange)",
                    },
                    {
                      name: "Canceladas",
                      value: stats?.canceladas ?? 0,
                      color: "var(--muted-foreground)",
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {[
                    "var(--brand-green)",
                    "var(--brand-orange)",
                    "var(--muted-foreground)",
                  ].map((cor, i) => (
                    <Cell key={i} fill={cor} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">
            Custo por veículo (abastecimento + manutenção)
          </h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={custoVeic ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="veiculo" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                />
                <Legend />
                <Bar
                  dataKey="abast"
                  name="Abastecimento"
                  stackId="c"
                  fill="var(--brand-blue)"
                />
                <Bar
                  dataKey="manut"
                  name="Manutenção"
                  stackId="c"
                  fill="var(--brand-orange)"
                  radius={[6, 6, 0, 0]}
                />
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
          <Link
            to="/viagens"
            className="text-sm text-primary hover:underline"
          >
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
                <th className="text-left p-3 hidden md:table-cell">
                  Secretaria
                </th>
                <th className="text-left p-3 hidden lg:table-cell">
                  Origem / Destino
                </th>
                <th className="text-right p-3 hidden sm:table-cell">
                  KM
                </th>
                <th className="text-right p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {(ultimas ?? []).map((viagem: any) => {
                const km =
                  viagem.km_retorno != null
                    ? Number(viagem.km_retorno) -
                      Number(viagem.km_saida)
                    : null;

                return (
                  <tr
                    key={viagem.id}
                    className="border-t hover:bg-muted/30"
                  >
                    <td className="p-3 font-mono text-xs">
                      {String(viagem.numero).padStart(6, "0")}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {formatarData(viagem.hora_saida)}
                    </td>

                    <td className="p-3">
                      <div className="font-medium">
                        {viagem.veiculos?.modelo ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {viagem.veiculos?.placa ?? "—"}
                      </div>
                    </td>

                    <td className="p-3 hidden md:table-cell">
                      {viagem.secretarias?.nome ?? "—"}
                    </td>

                    <td className="p-3 hidden lg:table-cell text-xs">
                      {viagem.origem} → {viagem.destino}
                    </td>

                    <td className="p-3 text-right hidden sm:table-cell whitespace-nowrap">
                      {km != null ? `${km} km` : "—"}
                    </td>

                    <td className="p-3 text-right">
                      <Badge
                        variant={
                          viagem.status === "finalizada"
                            ? "secondary"
                            : "default"
                        }
                        className={
                          viagem.status === "finalizada"
                            ? "bg-brand-green/15 text-brand-green hover:bg-brand-green/20"
                            : viagem.status === "em_andamento"
                              ? "bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20"
                              : ""
                        }
                      >
                        {viagem.status === "finalizada"
                          ? "Finalizada"
                          : viagem.status === "em_andamento"
                            ? "Em andamento"
                            : "Cancelada"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {(ultimas ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma viagem registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold">Últimas Manutenções</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Veículo</th>
                <th className="text-left p-3">Descrição</th>
                <th className="text-left p-3 hidden sm:table-cell">
                  Tipo
                </th>
                <th className="text-right p-3">Custo</th>
                <th className="text-right p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {(ultimasManutencoes ?? []).map((manutencao: any) => (
                <tr
                  key={manutencao.id}
                  className="border-t hover:bg-muted/30"
                >
                  <td className="p-3 whitespace-nowrap">
                    {formatarData(manutencao.data_abertura)}
                  </td>

                  <td className="p-3">
                    <div className="font-medium">
                      {manutencao.veiculos?.modelo ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {manutencao.veiculos?.placa ?? "—"}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="font-medium">
                      {manutencao.descricao}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {manutencao.oficina ?? ""}
                    </div>
                  </td>

                  <td className="p-3 hidden sm:table-cell">
                    {manutencao.tipo === "preventiva"
                      ? "Preventiva"
                      : "Corretiva"}
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    {manutencao.custo != null
                      ? Number(manutencao.custo).toLocaleString(
                          "pt-BR",
                          {
                            style: "currency",
                            currency: "BRL",
                          }
                        )
                      : "—"}
                  </td>

                  <td className="p-3 text-right">
                    <Badge
                      variant={
                        manutencao.status === "concluida"
                          ? "secondary"
                          : "default"
                      }
                      className={
                        manutencao.status === "concluida"
                          ? "bg-brand-green/15 text-brand-green"
                          : manutencao.status === "cancelada"
                            ? "bg-muted text-muted-foreground"
                            : "bg-brand-orange/15 text-brand-orange"
                      }
                    >
                      {manutencao.status === "concluida"
                        ? "Concluída"
                        : manutencao.status === "cancelada"
                          ? "Cancelada"
                          : manutencao.status === "em_andamento"
                            ? "Em andamento"
                            : "Aberta"}
                    </Badge>
                  </td>
                </tr>
              ))}

              {(ultimasManutencoes ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma manutenção registrada ainda.
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
