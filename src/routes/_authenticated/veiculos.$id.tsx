import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, Fuel, Wrench, Route as RouteIcon, Gauge, Calendar } from "lucide-react";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/veiculos/$id")({
  component: VeiculoDetail,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Veículo não encontrado.</p>
      <Link to="/veiculos" className="text-brand-blue underline text-sm">Voltar</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{error.message}</div>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
};

function VeiculoDetail() {
  const { id } = Route.useParams();

  const { data: v, isLoading } = useQuery({
    queryKey: ["veiculo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select("*, secretarias(nome)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: viagens } = useQuery({
    queryKey: ["veiculo-viagens", id],
    queryFn: async () =>
      (await supabase
        .from("viagens")
        .select("id, destino, origem, hora_saida, hora_chegada, status, km_saida, km_retorno")
        .eq("veiculo_id", id)
        .order("hora_saida", { ascending: false })
        .limit(10)).data ?? [],
  });

  const { data: abast } = useQuery({
    queryKey: ["veiculo-abast", id],
    queryFn: async () =>
      (await supabase
        .from("abastecimentos")
        .select("id, data, litros, valor_total, valor_litro, km, tipo_combustivel, posto")
        .eq("veiculo_id", id)
        .order("data", { ascending: false })
        .limit(10)).data ?? [],
  });

  const { data: manut } = useQuery({
    queryKey: ["veiculo-manut", id],
    queryFn: async () =>
      (await supabase
        .from("manutencoes")
        .select("id, tipo, descricao, status, data_abertura, data_conclusao, custo, oficina")
        .eq("veiculo_id", id)
        .order("data_abertura", { ascending: false })
        .limit(10)).data ?? [],
  });

  if (isLoading || !v) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const totalGasto = (abast ?? []).reduce((s: number, a: any) => s + Number(a.valor_total ?? 0), 0);
  const totalLitros = (abast ?? []).reduce((s: number, a: any) => s + Number(a.litros ?? 0), 0);
  const custoManut = (manut ?? []).reduce((s: number, m: any) => s + Number(m.custo ?? 0), 0);

  const alertas = getAlertas(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/veiculos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{v.modelo}</h1>
          <p className="text-sm text-muted-foreground font-mono">{v.placa}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline">{STATUS_LABEL[v.status]}</Badge>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Marca</p>
              <p>{v.marca ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ano</p>
              <p>{v.ano ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p>{v.tipo ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Km</p>
              <p>{v.km_atual?.toLocaleString("pt-BR")}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Secretaria</p>
              <p>{(v as any).secretarias?.nome ?? "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Combustível (últimos 10)</p>
              <p className="text-lg font-bold">R$ {totalGasto.toFixed(2)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {totalLitros.toFixed(2)} L abastecidos
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manutenções (últimas 10)</p>
              <p className="text-lg font-bold">R$ {custoManut.toFixed(2)}</p>
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
            <Calendar className="h-3.5 w-3.5" /> Alertas
          </p>
          <ul className="text-sm space-y-1">
            {alertas.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><RouteIcon className="h-4 w-4" /> Últimas viagens</h2>
        {(viagens ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma viagem registrada.</p>
        ) : (
          <div className="space-y-2">
            {(viagens ?? []).map((t: any) => (
              <Link key={t.id} to="/viagens/$id" params={{ id: t.id }} className="block rounded-lg border p-3 hover:bg-muted/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.origem} → {t.destino}</p>
                  <Badge variant="outline" className="capitalize">{String(t.status).replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(t.hora_saida), "dd/MM/yy HH:mm", { locale: ptBR })}
                  {t.km_retorno != null && ` · ${(t.km_retorno - t.km_saida).toLocaleString("pt-BR")} km`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Fuel className="h-4 w-4" /> Últimos abastecimentos</h2>
        {(abast ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum abastecimento.</p>
        ) : (
          <div className="space-y-2">
            {(abast ?? []).map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 py-2 text-sm">
                <div>
                  <p className="font-medium capitalize">{String(a.tipo_combustivel).replace("_", " ")} · {Number(a.litros).toFixed(2)} L</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(a.data), "dd/MM/yy", { locale: ptBR })}
                    {a.posto && ` · ${a.posto}`}
                    {a.km != null && ` · ${a.km.toLocaleString("pt-BR")} km`}
                  </p>
                </div>
                <p className="font-semibold">R$ {Number(a.valor_total).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Wrench className="h-4 w-4" /> Últimas manutenções</h2>
        {(manut ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma manutenção.</p>
        ) : (
          <div className="space-y-2">
            {(manut ?? []).map((m: any) => (
              <div key={m.id} className="border-b last:border-0 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{m.tipo}</Badge>
                  <Badge variant="outline" className="capitalize">{String(m.status).replace("_", " ")}</Badge>
                  {m.custo != null && <span className="ml-auto font-semibold">R$ {Number(m.custo).toFixed(2)}</span>}
                </div>
                <p className="mt-1">{m.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(m.data_abertura), "dd/MM/yy", { locale: ptBR })}
                  {m.oficina && ` · ${m.oficina}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Gauge className="h-4 w-4" /> Agenda</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <AgendaRow label="Licenciamento" data={v.licenciamento_ate} />
          <AgendaRow label="IPVA" data={v.ipva_ate} />
          <AgendaRow label="Seguro" data={v.seguro_ate} />
          <div>
            <p className="text-xs text-muted-foreground">Próxima troca de óleo</p>
            <p>{v.proximo_oleo_km ? `${v.proximo_oleo_km.toLocaleString("pt-BR")} km` : "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AgendaRow({ label, data }: { label: string; data: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{data ? format(parseISO(data), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
    </div>
  );
}

function getAlertas(v: any): string[] {
  const out: string[] = [];
  const soon = addDays(new Date(), 30);
  const chk = (label: string, d: string | null) => {
    if (!d) return;
    const dt = parseISO(d);
    if (isBefore(dt, new Date())) out.push(`${label} vencido em ${format(dt, "dd/MM/yyyy")}`);
    else if (isBefore(dt, soon)) out.push(`${label} vence em ${format(dt, "dd/MM/yyyy")}`);
  };
  chk("Licenciamento", v.licenciamento_ate);
  chk("IPVA", v.ipva_ate);
  chk("Seguro", v.seguro_ate);
  if (v.proximo_oleo_km && v.km_atual >= v.proximo_oleo_km) {
    out.push(`Troca de óleo prevista há ${(v.km_atual - v.proximo_oleo_km).toLocaleString("pt-BR")} km`);
  }
  return out;
}