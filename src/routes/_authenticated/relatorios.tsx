
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  FileText,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Tipo =
  | "viagens"
  | "abastecimentos"
  | "manutencoes";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface RegistroPaginado {
  rows: any[];
  total: number;
  page: number;
  pageSize: number;
}

interface Secretaria {
  id: string;
  nome: string;
  sigla?: string | null;
}

interface Veiculo {
  id: string;
  modelo: string;
  placa: string;
}

const PAGE_SIZE = 100;

async function buscarTodosPaginados(
  endpoint: string
): Promise<any[]> {
  const primeiraResposta =
    await apiRequest<ApiResponse<RegistroPaginado>>(
      `${endpoint}?page=0&pageSize=${PAGE_SIZE}`
    );

  const primeiraPagina =
    primeiraResposta.data?.rows ?? [];

  const total =
    Number(primeiraResposta.data?.total ?? primeiraPagina.length);

  const totalPaginas =
    Math.ceil(total / PAGE_SIZE);

  if (totalPaginas <= 1) {
    return primeiraPagina;
  }

  const demaisPaginas = await Promise.all(
    Array.from(
      { length: totalPaginas - 1 },
      (_, indice) =>
        apiRequest<ApiResponse<RegistroPaginado>>(
          `${endpoint}?page=${indice + 1}&pageSize=${PAGE_SIZE}`
        )
    )
  );

  return [
    ...primeiraPagina,
    ...demaisPaginas.flatMap(
      (resposta) => resposta.data?.rows ?? []
    ),
  ];
}

function dataValida(valor: any): Date | null {
  if (!valor) return null;

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
}

function formatarData(
  valor: any,
  formato = "dd/MM/yy"
): string {
  const data = dataValida(valor);

  return data
    ? format(data, formato)
    : "—";
}

function dentroDoPeriodo(
  valor: any,
  inicio: string,
  fim: string
): boolean {
  const data = dataValida(valor);

  if (!data) return false;

  const dataInicio =
    new Date(`${inicio}T00:00:00`);

  const dataFim =
    new Date(`${fim}T23:59:59.999`);

  return (
    data.getTime() >= dataInicio.getTime() &&
    data.getTime() <= dataFim.getTime()
  );
}

function RelatoriosPage() {
  const hoje = new Date();

  const [tipo, setTipo] =
    useState<Tipo>("viagens");

  const [inicio, setInicio] = useState(
    format(startOfMonth(hoje), "yyyy-MM-dd")
  );

  const [fim, setFim] = useState(
    format(endOfMonth(hoje), "yyyy-MM-dd")
  );

  const [secretariaId, setSecretariaId] =
    useState("todas");

  const [veiculoId, setVeiculoId] =
    useState("todos");

  const { data: secretarias = [] } = useQuery({
    queryKey: ["relatorios-secretarias"],
    queryFn: async () => {
      const resposta =
        await apiRequest<ApiResponse<Secretaria[]>>(
          "/secretarias"
        );

      return resposta.data ?? [];
    },
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["relatorios-veiculos"],
    queryFn: async () => {
      return buscarTodosPaginados("/veiculos");
    },
  });

  const {
    data: dados = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["relatorio-dados", tipo],

    queryFn: async () => {
      if (tipo === "viagens") {
        const resposta =
          await apiRequest<ApiResponse<any[]>>(
            "/viagens?limit=500"
          );

        return resposta.data ?? [];
      }

      if (tipo === "abastecimentos") {
        return buscarTodosPaginados(
          "/abastecimentos"
        );
      }

      return buscarTodosPaginados(
        "/manutencoes"
      );
    },
  });

  const rows = useMemo(() => {
    if (!inicio || !fim || inicio > fim) {
      return [];
    }

    return dados.filter((registro: any) => {
      const dataRegistro =
        tipo === "viagens"
          ? registro.hora_saida
          : tipo === "abastecimentos"
            ? registro.data
            : registro.data_abertura;

      if (
        !dentroDoPeriodo(
          dataRegistro,
          inicio,
          fim
        )
      ) {
        return false;
      }

      if (
        veiculoId !== "todos" &&
        registro.veiculo_id !== veiculoId
      ) {
        return false;
      }

      if (
        tipo === "viagens" &&
        secretariaId !== "todas" &&
        registro.secretaria_id !== secretariaId
      ) {
        return false;
      }

      return true;
    });
  }, [
    dados,
    tipo,
    inicio,
    fim,
    secretariaId,
    veiculoId,
  ]);

  const table = useMemo(
    () => buildTable(tipo, rows),
    [tipo, rows]
  );

  const totalKm =
    tipo === "viagens"
      ? rows.reduce(
          (total: number, registro: any) => {
            if (registro.km_retorno == null) {
              return total;
            }

            return (
              total +
              Number(registro.km_retorno) -
              Number(registro.km_saida || 0)
            );
          },
          0
        )
      : 0;

  const totalValor =
    tipo === "abastecimentos"
      ? rows.reduce(
          (total: number, registro: any) =>
            total +
            Number(registro.valor_total || 0),
          0
        )
      : tipo === "manutencoes"
        ? rows.reduce(
            (total: number, registro: any) =>
              total +
              Number(registro.custo || 0),
            0
          )
        : 0;

  function exportPDF() {
    if (rows.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
    });

    const titulo =
      tipo === "viagens"
        ? "Relatório de Viagens"
        : tipo === "abastecimentos"
          ? "Relatório de Abastecimentos"
          : "Relatório de Manutenções";

    doc.setFontSize(14);
    doc.text(titulo, 14, 14);

    doc.setFontSize(9);

    doc.text(
      `Período: ${format(new Date(`${inicio}T12:00:00`), "dd/MM/yyyy")} a ${format(new Date(`${fim}T12:00:00`), "dd/MM/yyyy")} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
      14,
      20
    );

    autoTable(doc, {
      startY: 26,
      head: [table.head],
      body: table.body,
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [30, 58, 138],
      },
    });

    const finalY =
      (doc as any).lastAutoTable?.finalY ?? 30;

    doc.setFontSize(10);

    if (tipo === "viagens") {
      doc.text(
        `Total de viagens: ${rows.length} · Km rodados: ${totalKm.toLocaleString("pt-BR")} km`,
        14,
        finalY + 8
      );
    } else {
      doc.text(
        `Registros: ${rows.length} · Total: R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        14,
        finalY + 8
      );
    }

    doc.save(
      `${tipo}_${inicio}_${fim}.pdf`
    );
  }

  function exportXLSX() {
    if (rows.length === 0) return;

    const ws = XLSX.utils.aoa_to_sheet([
      table.head,
      ...table.body,
    ]);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      tipo
    );

    XLSX.writeFile(
      wb,
      `${tipo}_${inicio}_${fim}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Relatórios
        </h1>

        <p className="text-sm text-muted-foreground">
          Exporte dados por período em PDF ou Excel
        </p>
      </div>

      <Tabs
        value={tipo}
        onValueChange={(valor) =>
          setTipo(valor as Tipo)
        }
      >
        <TabsList>
          <TabsTrigger value="viagens">
            Viagens
          </TabsTrigger>

          <TabsTrigger value="abastecimentos">
            Abastecimentos
          </TabsTrigger>

          <TabsTrigger value="manutencoes">
            Manutenções
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value={tipo}
          className="mt-4 space-y-4"
        >
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label>Início</Label>

                <Input
                  type="date"
                  value={inicio}
                  onChange={(e) =>
                    setInicio(e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Fim</Label>

                <Input
                  type="date"
                  value={fim}
                  onChange={(e) =>
                    setFim(e.target.value)
                  }
                />
              </div>

              {tipo === "viagens" && (
                <div className="space-y-1">
                  <Label>Secretaria</Label>

                  <Select
                    value={secretariaId}
                    onValueChange={setSecretariaId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="todas">
                        Todas
                      </SelectItem>

                      {secretarias.map(
                        (secretaria) => (
                          <SelectItem
                            key={secretaria.id}
                            value={secretaria.id}
                          >
                            {secretaria.nome}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label>Veículo</Label>

                <Select
                  value={veiculoId}
                  onValueChange={setVeiculoId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="todos">
                      Todos
                    </SelectItem>

                    {veiculos.map(
                      (veiculo: any) => (
                        <SelectItem
                          key={veiculo.id}
                          value={veiculo.id}
                        >
                          {veiculo.modelo} · {veiculo.placa}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={exportXLSX}
                  disabled={
                    isLoading || rows.length === 0
                  }
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>

                <Button
                  onClick={exportPDF}
                  disabled={
                    isLoading || rows.length === 0
                  }
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </Card>

          {inicio > fim && (
            <p className="text-sm text-destructive">
              A data inicial não pode ser posterior à data final.
            </p>
          )}

          {isLoading && (
            <Card className="p-8 text-center text-muted-foreground">
              Carregando registros do relatório...
            </Card>
          )}

          {isError && (
            <Card className="p-8 text-center text-destructive">
              Não foi possível carregar os dados do relatório.
              <p className="mt-2 text-sm">
                {(error as Error)?.message ||
                  "Verifique sua conexão e tente novamente."}
              </p>
            </Card>
          )}

          {!isLoading && !isError && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Registros
                  </p>

                  <p className="text-2xl font-bold">
                    {rows.length}
                  </p>
                </Card>

                {tipo === "viagens" && (
                  <Card className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">
                      Km rodados
                    </p>

                    <p className="text-2xl font-bold">
                      {totalKm.toLocaleString("pt-BR")}
                    </p>
                  </Card>
                )}

                {(tipo === "abastecimentos" ||
                  tipo === "manutencoes") && (
                  <Card className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">
                      Total gasto
                    </p>

                    <p className="text-2xl font-bold">
                      {totalValor.toLocaleString(
                        "pt-BR",
                        {
                          style: "currency",
                          currency: "BRL",
                        }
                      )}
                    </p>
                  </Card>
                )}

                <Card className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
                  <BarChart3 className="h-5 w-5" />

                  <span>
                    Ajuste os filtros para atualizar os totais.
                  </span>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        {table.head.map((coluna) => (
                          <th
                            key={coluna}
                            className="text-left p-2"
                          >
                            {coluna}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {table.body.map(
                        (registro, indice) => (
                          <tr
                            key={indice}
                            className="border-t"
                          >
                            {registro.map(
                              (celula, coluna) => (
                                <td
                                  key={coluna}
                                  className="p-2 whitespace-nowrap"
                                >
                                  {celula}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}

                      {table.body.length === 0 && (
                        <tr>
                          <td
                            colSpan={table.head.length}
                            className="p-8 text-center text-muted-foreground"
                          >
                            Nenhum registro no período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildTable(
  tipo: Tipo,
  rows: any[]
): {
  head: string[];
  body: string[][];
} {
  if (tipo === "viagens") {
    return {
      head: [
        "Nº",
        "Data",
        "Veículo",
        "Placa",
        "Motorista",
        "Secretaria",
        "Origem",
        "Destino",
        "Km rod.",
        "Status",
      ],

      body: rows.map((registro) => [
        String(registro.numero ?? "—").padStart(
          6,
          "0"
        ),

        formatarData(
          registro.hora_saida,
          "dd/MM/yy HH:mm"
        ),

        registro.veiculos?.modelo ?? "—",
        registro.veiculos?.placa ?? "—",
        registro.profiles?.nome ?? "—",
        registro.secretarias?.nome ?? "—",
        registro.origem ?? "—",
        registro.destino ?? "—",

        registro.km_retorno != null
          ? String(
              Number(registro.km_retorno) -
                Number(registro.km_saida || 0)
            )
          : "—",

        registro.status ?? "—",
      ]),
    };
  }

  if (tipo === "abastecimentos") {
    return {
      head: [
        "Data",
        "Veículo",
        "Placa",
        "Combust.",
        "Litros",
        "R$/L",
        "Total (R$)",
        "Km",
      ],

      body: rows.map((registro) => [
        formatarData(registro.data),

        registro.veiculos?.modelo ?? "—",
        registro.veiculos?.placa ?? "—",
        registro.tipo_combustivel ?? "—",

        registro.litros != null
          ? String(registro.litros)
          : "—",

        registro.valor_litro != null
          ? Number(registro.valor_litro).toFixed(2)
          : "—",

        registro.valor_total != null
          ? Number(registro.valor_total).toFixed(2)
          : "—",

        registro.km != null
          ? String(registro.km)
          : "—",
      ]),
    };
  }

  return {
    head: [
      "Abertura",
      "Veículo",
      "Placa",
      "Tipo",
      "Descrição",
      "Oficina",
      "Km",
      "Custo (R$)",
      "Status",
    ],

    body: rows.map((registro) => [
      formatarData(registro.data_abertura),

      registro.veiculos?.modelo ?? "—",
      registro.veiculos?.placa ?? "—",
      registro.tipo ?? "—",
      registro.descricao ?? "—",
      registro.oficina ?? "—",

      registro.km != null
        ? String(registro.km)
        : "—",

      registro.custo != null
        ? Number(registro.custo).toFixed(2)
        : "—",

      registro.status ?? "—",
    ]),
  };
}
