import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, FileSpreadsheet, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Tipo = "viagens" | "abastecimentos" | "manutencoes";

function RelatoriosPage() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<Tipo>("viagens");
  const [inicio, setInicio] = useState(format(startOfMonth(hoje), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(endOfMonth(hoje), "yyyy-MM-dd"));
  const [secretariaId, setSecretariaId] = useState<string>("todas");
  const [veiculoId, setVeiculoId] = useState<string>("todos");

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });
  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-all"],
    queryFn: async () => (await supabase.from("veiculos").select("*").order("modelo")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["relatorio", tipo, inicio, fim, secretariaId, veiculoId],
    queryFn: async () => {
      const inicioISO = new Date(inicio + "T00:00:00").toISOString();
      const fimISO = new Date(fim + "T23:59:59").toISOString();
      if (tipo === "viagens") {
        let q = supabase
          .from("viagens")
          .select("*, veiculos(placa,modelo), secretarias(nome), profiles:motorista_id(nome)")
          .gte("hora_saida", inicioISO)
          .lte("hora_saida", fimISO)
          .order("hora_saida", { ascending: false });
        if (secretariaId !== "todas") q = q.eq("secretaria_id", secretariaId);
        if (veiculoId !== "todos") q = q.eq("veiculo_id", veiculoId);
        return (await q).data ?? [];
      }
      if (tipo === "abastecimentos") {
        let q = supabase
          .from("abastecimentos")
          .select("*, veiculos(placa,modelo)")
          .gte("data", inicioISO)
          .lte("data", fimISO)
          .order("data", { ascending: false });
        if (veiculoId !== "todos") q = q.eq("veiculo_id", veiculoId);
        return (await q).data ?? [];
      }
      let q = supabase
        .from("manutencoes")
        .select("*, veiculos(placa,modelo)")
        .gte("data_abertura", inicioISO)
        .lte("data_abertura", fimISO)
        .order("data_abertura", { ascending: false });
      if (veiculoId !== "todos") q = q.eq("veiculo_id", veiculoId);
      return (await q).data ?? [];
    },
  });

  const table = useMemo(() => buildTable(tipo, rows ?? []), [tipo, rows]);

  const totalKm =
    tipo === "viagens"
      ? (rows ?? []).reduce(
          (a: number, r: any) => a + (r.km_retorno != null ? r.km_retorno - r.km_saida : 0),
          0,
        )
      : 0;
  const totalValor =
    tipo === "abastecimentos"
      ? (rows ?? []).reduce((a: number, r: any) => a + Number(r.valor_total || 0), 0)
      : tipo === "manutencoes"
        ? (rows ?? []).reduce((a: number, r: any) => a + Number(r.custo || 0), 0)
        : 0;

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
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
      `Período: ${format(new Date(inicio), "dd/MM/yyyy")} a ${format(new Date(fim), "dd/MM/yyyy")} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
      14,
      20,
    );
    autoTable(doc, {
      startY: 26,
      head: [table.head],
      body: table.body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
    if (tipo === "viagens") {
      doc.setFontSize(10);
      doc.text(`Total de viagens: ${(rows ?? []).length}   ·   Km rodados: ${totalKm.toLocaleString("pt-BR")} km`, 14, finalY + 8);
    } else if (tipo === "abastecimentos" || tipo === "manutencoes") {
      doc.setFontSize(10);
      doc.text(`Registros: ${(rows ?? []).length}   ·   Total: R$ ${totalValor.toFixed(2)}`, 14, finalY + 8);
    }
    doc.save(`${tipo}_${inicio}_${fim}.pdf`);
  }

  function exportXLSX() {
    const ws = XLSX.utils.aoa_to_sheet([table.head, ...table.body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo);
    XLSX.writeFile(wb, `${tipo}_${inicio}_${fim}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Exporte dados por período em PDF ou Excel
        </p>
      </div>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
        <TabsList>
          <TabsTrigger value="viagens">Viagens</TabsTrigger>
          <TabsTrigger value="abastecimentos">Abastecimentos</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
        </TabsList>

        <TabsContent value={tipo} className="mt-4 space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label>Início</Label>
                <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
              {tipo === "viagens" && (
                <div className="space-y-1">
                  <Label>Secretaria</Label>
                  <Select value={secretariaId} onValueChange={setSecretariaId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {(secretarias ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Veículo</Label>
                <Select value={veiculoId} onValueChange={setVeiculoId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {(veiculos ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.modelo} · {v.placa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={exportXLSX} className="flex-1">
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
                <Button onClick={exportPDF} className="flex-1">
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold">{(rows ?? []).length}</p>
            </Card>
            {tipo === "viagens" && (
              <Card className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Km rodados</p>
                <p className="text-2xl font-bold">{totalKm.toLocaleString("pt-BR")}</p>
              </Card>
            )}
            {(tipo === "abastecimentos" || tipo === "manutencoes") && (
              <Card className="p-4">
                <p className="text-xs uppercase text-muted-foreground">Total gasto</p>
                <p className="text-2xl font-bold">R$ {totalValor.toFixed(2)}</p>
              </Card>
            )}
            <Card className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-5 w-5" />
              <span>Ajuste os filtros para atualizar os totais.</span>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {table.head.map((h) => (
                      <th key={h} className="text-left p-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.body.map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.map((c, j) => (
                        <td key={j} className="p-2 whitespace-nowrap">{c}</td>
                      ))}
                    </tr>
                  ))}
                  {table.body.length === 0 && (
                    <tr>
                      <td colSpan={table.head.length} className="p-8 text-center text-muted-foreground">
                        Nenhum registro no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildTable(tipo: Tipo, rows: any[]): { head: string[]; body: string[][] } {
  if (tipo === "viagens") {
    return {
      head: ["Nº", "Data", "Veículo", "Placa", "Motorista", "Secretaria", "Origem", "Destino", "Km rod.", "Status"],
      body: rows.map((r) => [
        String(r.numero).padStart(6, "0"),
        format(new Date(r.hora_saida), "dd/MM/yy HH:mm"),
        r.veiculos?.modelo ?? "—",
        r.veiculos?.placa ?? "—",
        r.profiles?.nome ?? "—",
        r.secretarias?.nome ?? "—",
        r.origem,
        r.destino,
        r.km_retorno != null ? String(r.km_retorno - r.km_saida) : "—",
        r.status,
      ]),
    };
  }
  if (tipo === "abastecimentos") {
    return {
      head: ["Data", "Veículo", "Placa", "Combust.", "Litros", "R$/L", "Total (R$)", "Km"],
      body: rows.map((r) => [
        format(new Date(r.data), "dd/MM/yy"),
        r.veiculos?.modelo ?? "—",
        r.veiculos?.placa ?? "—",
        r.tipo_combustivel ?? "—",
        String(r.litros ?? "—"),
        r.valor_litro != null ? Number(r.valor_litro).toFixed(2) : "—",
        r.valor_total != null ? Number(r.valor_total).toFixed(2) : "—",
        r.km_atual != null ? String(r.km_atual) : "—",
      ]),
    };
  }
  return {
    head: ["Abertura", "Veículo", "Placa", "Tipo", "Descrição", "Oficina", "Km", "Custo (R$)", "Status"],
    body: rows.map((r) => [
      format(new Date(r.data_abertura), "dd/MM/yy"),
      r.veiculos?.modelo ?? "—",
      r.veiculos?.placa ?? "—",
      r.tipo,
      r.descricao,
      r.oficina ?? "—",
      r.km != null ? String(r.km) : "—",
      r.custo != null ? Number(r.custo).toFixed(2) : "—",
      r.status,
    ]),
  };
}