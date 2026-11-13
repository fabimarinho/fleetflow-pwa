import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Car,
  Fuel,
  Wrench,
  Route as RouteIcon,
  Gauge,
  Calendar,
  CalendarDays,
} from "lucide-react";
import {
  format,
  parseISO,
  isBefore,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/veiculos/$id")({
  component: VeiculoDetail,
  notFoundComponent: () => (
    <div className="p-4 sm:p-8 text-center">
      <p className="text-muted-foreground">
        Veículo não encontrado.
      </p>
      <Link
        to="/veiculos"
        className="text-brand-blue underline text-sm"
      >
        Voltar
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-4 sm:p-8 text-center text-destructive break-words">
      {error.message}
    </div>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
};

const AGENDAMENTO_STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

function VeiculoDetail() {
  const { id } = Route.useParams();

  const { data: v, isLoading } = useQuery({
    queryKey: ["veiculo", id],
    queryFn: async () => {
      try {
        const response = await apiRequest<any>(`/veiculos/${id}`);

        if (!response.data) {
          throw notFound();
        }

        return response.data;
      } catch (error: any) {
        if (
          error?.status === 404 ||
          error?.message?.toLowerCase().includes("não encontrado") ||
          error?.message?.toLowerCase().includes("nao encontrado")
        ) {
          throw notFound();
        }

        throw error;
      }
    },
  });

  const { data: viagens } = useQuery({
    queryKey: ["veiculo-viagens", id],
    queryFn: async () => {
      const response = await apiRequest<any>(
        `/viagens?veiculoId=${encodeURIComponent(id)}&limit=10`
      );

      return response.data ?? [];
    },
  });

  const { data: abast } = useQuery({
    queryKey: ["veiculo-abast", id],
    queryFn: async () => {
      const response = await apiRequest<any>(
        `/abastecimentos?veiculoId=${encodeURIComponent(id)}&limit=10`
      );

      return response.data ?? [];
    },
  });

  const { data: manut } = useQuery({
    queryKey: ["veiculo-manut", id],
    queryFn: async () => {
      const response = await apiRequest<any>(
        "/manutencoes?page=0&pageSize=100"
      );

      const registros = Array.isArray(response.data)
        ? response.data
        : response.data?.rows ?? [];

      return registros
        .filter((m: any) => String(m.veiculo_id) === String(id))
        .sort(
          (a: any, b: any) =>
            new Date(b.data_abertura).getTime() -
            new Date(a.data_abertura).getTime()
        )
        .slice(0, 10);
    },
  });

  const { data: agendamentos } = useQuery({
    queryKey: ["agendamentos-veiculo", id],
    queryFn: async () => {
      const response = await apiRequest<any>(
        `/agendamentos-manutencao?veiculoId=${encodeURIComponent(id)}&page=0&pageSize=100`
      );

      const registros = Array.isArray(response.data)
        ? response.data
        : response.data?.rows ?? [];

      return registros.sort(
        (a: any, b: any) =>
          new Date(a.data_agendada).getTime() -
          new Date(b.data_agendada).getTime()
      );
    },
  });

  if (isLoading || !v) {
    return (
      <div className="p-4 sm:p-8 text-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const totalGasto = (abast ?? []).reduce(
    (s: number, a: any) => s + Number(a.valor_total ?? 0),
    0
  );

  const totalLitros = (abast ?? []).reduce(
    (s: number, a: any) => s + Number(a.litros ?? 0),
    0
  );

  const custoManut = (manut ?? []).reduce(
    (s: number, m: any) => s + Number(m.custo ?? 0),
    0
  );

  const agendamentosAtivos = (agendamentos ?? []).filter(
    (a: any) => a.status === "agendada"
  );

  const alertas = getAlertas(v);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/veiculos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
            {v.modelo}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {v.placa}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <Car className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline">
                {STATUS_LABEL[v.status] ?? v.status}
              </Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Marca</p>
              <p className="break-words">{v.marca ?? "—"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Ano</p>
              <p>{v.ano ?? "—"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="break-words">{v.tipo ?? "—"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Km</p>
              <p>{v.km_atual?.toLocaleString("pt-BR") ?? "—"}</p>
            </div>

            <div className="col-span-2 min-w-0">
              <p className="text-xs text-muted-foreground">Secretaria</p>
              <p className="break-words">
                {(v as any).secretarias?.nome ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
              <Fuel className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Combustível (últimos 10)
              </p>
              <p className="text-lg font-bold">
                R$ {totalGasto.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {totalLitros.toFixed(2)} L abastecidos
          </p>
        </Card>

        <Card className="p-4 sm:p-5 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Wrench className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Manutenções (últimas 10)
              </p>
              <p className="text-lg font-bold">
                R$ {custoManut.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {(manut ?? []).length} registro(s)
          </p>
        </Card>
      </div>

      {alertas.length > 0 && (
        <Card className="p-4 border-brand-orange/40 bg-brand-orange/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Alertas
          </p>

          <ul className="text-sm space-y-1">
            {alertas.map((a) => (
              <li key={a} className="break-words">
                • {a}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <RouteIcon className="h-4 w-4 shrink-0" />
          Últimas viagens
        </h2>

        {(viagens ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma viagem registrada.
          </p>
        ) : (
          <div className="space-y-2">
            {(viagens ?? []).map((t: any) => (
              <Link
                key={t.id}
                to="/viagens/$id"
                params={{ id: t.id }}
                className="block rounded-lg border p-3 hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium break-words min-w-0">
                    {t.origem} → {t.destino}
                  </p>

                  <Badge variant="outline" className="capitalize shrink-0">
                    {String(t.status).replace("_", " ")}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {t.hora_saida
                    ? format(parseISO(t.hora_saida), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })
                    : "Data não informada"}

                  {t.km_retorno != null &&
                    ` · ${(t.km_retorno - t.km_saida).toLocaleString("pt-BR")} km`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Fuel className="h-4 w-4 shrink-0" />
          Últimos abastecimentos
        </h2>

        {(abast ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum abastecimento.
          </p>
        ) : (
          <div className="space-y-2">
            {(abast ?? []).map((a: any) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize break-words">
                    {String(a.tipo_combustivel).replace("_", " ")}
                    {" · "}
                    {Number(a.litros).toFixed(2)} L
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {a.data
                      ? format(parseISO(a.data), "dd/MM/yy", {
                          locale: ptBR,
                        })
                      : "Data não informada"}

                    {a.posto && ` · ${a.posto}`}

                    {a.km != null &&
                      ` · ${Number(a.km).toLocaleString("pt-BR")} km`}
                  </p>
                </div>

                <p className="font-semibold whitespace-nowrap">
                  R$ {Number(a.valor_total).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 shrink-0" />
          Últimas manutenções
        </h2>

        {(manut ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma manutenção.
          </p>
        ) : (
          <div className="space-y-2">
            {(manut ?? []).map((m: any) => (
              <div
                key={m.id}
                className="border-b last:border-0 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {m.tipo}
                  </Badge>

                  <Badge variant="outline" className="capitalize">
                    {String(m.status).replace("_", " ")}
                  </Badge>

                  {m.custo != null && (
                    <span className="ml-auto font-semibold whitespace-nowrap">
                      R$ {Number(m.custo).toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="mt-1 break-words">{m.descricao}</p>

                <p className="text-xs text-muted-foreground">
                  {m.data_abertura
                    ? format(parseISO(m.data_abertura), "dd/MM/yy", {
                        locale: ptBR,
                      })
                    : "Data não informada"}

                  {m.oficina && ` · ${m.oficina}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 shrink-0" />
          Agenda
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <AgendaRow label="Licenciamento" data={v.licenciamento_ate} />
          <AgendaRow label="IPVA" data={v.ipva_ate} />
          <AgendaRow label="Seguro" data={v.seguro_ate} />

          <div>
            <p className="text-xs text-muted-foreground">
              Próxima troca de óleo
            </p>

            <p>
              {v.proximo_oleo_km
                ? `${v.proximo_oleo_km.toLocaleString("pt-BR")} km`
                : "—"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 shrink-0" />
          Agendamentos de manutenção
          <Badge variant="outline" className="ml-auto">
            {agendamentosAtivos.length}
          </Badge>
        </h2>

        {agendamentosAtivos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum agendamento ativo para este veículo.
          </p>
        ) : (
          <div className="space-y-3">
            {agendamentosAtivos.map((a: any) => (
              <div
                key={a.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium capitalize">
                    {a.tipo}
                  </p>

                  <Badge variant="outline">
                    {AGENDAMENTO_STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </div>

                <p className="text-sm break-words">
                  {a.descricao}
                </p>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    {a.data_agendada
                      ? format(parseISO(a.data_agendada), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })
                      : "Data não informada"}
                  </p>

                  {a.oficina && (
                    <p>Oficina: {a.oficina}</p>
                  )}

                  {a.km_previsto != null && (
                    <p>
                      Km previsto: {Number(a.km_previsto).toLocaleString("pt-BR")} km
                    </p>
                  )}

                  {a.observacoes && (
                    <p className="break-words">
                      Observações: {a.observacoes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AgendaRow({
  label,
  data,
}: {
  label: string;
  data: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p>
        {data
          ? format(parseISO(data), "dd/MM/yyyy", {
              locale: ptBR,
            })
          : "—"}
      </p>
    </div>
  );
}

function getAlertas(v: any): string[] {
  const out: string[] = [];
  const soon = addDays(new Date(), 30);

  const chk = (label: string, d: string | null) => {
    if (!d) return;

    const dt = parseISO(d);

    if (isBefore(dt, new Date())) {
      out.push(`${label} vencido em ${format(dt, "dd/MM/yyyy")}`);
    } else if (isBefore(dt, soon)) {
      out.push(`${label} vence em ${format(dt, "dd/MM/yyyy")}`);
    }
  };

  chk("Licenciamento", v.licenciamento_ate);
  chk("IPVA", v.ipva_ate);
  chk("Seguro", v.seguro_ate);

  if (v.proximo_oleo_km && v.km_atual >= v.proximo_oleo_km) {
    out.push(
      `Troca de óleo prevista há ${(v.km_atual - v.proximo_oleo_km).toLocaleString("pt-BR")} km`
    );
  }

  return out;
}
