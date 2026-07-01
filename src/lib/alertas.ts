import { differenceInDays } from "date-fns";

export type Alerta = {
  veiculo_id: string;
  veiculo: string;
  placa: string;
  tipo: "licenciamento" | "ipva" | "seguro" | "oleo";
  label: string;
  severidade: "alta" | "media" | "baixa";
  detalhe: string;
};

export function computeAlertas(veiculos: any[]): Alerta[] {
  const hoje = new Date();
  const list: Alerta[] = [];
  for (const v of veiculos ?? []) {
    const base = { veiculo_id: v.id, veiculo: v.modelo, placa: v.placa };
    const dateFields: Array<{ f: string; tipo: Alerta["tipo"]; label: string }> = [
      { f: "licenciamento_ate", tipo: "licenciamento", label: "Licenciamento" },
      { f: "ipva_ate", tipo: "ipva", label: "IPVA" },
      { f: "seguro_ate", tipo: "seguro", label: "Seguro" },
    ];
    for (const df of dateFields) {
      const raw = v[df.f];
      if (!raw) continue;
      const d = new Date(raw);
      const diff = differenceInDays(d, hoje);
      let severidade: Alerta["severidade"] | null = null;
      if (diff < 0) severidade = "alta";
      else if (diff <= 15) severidade = "alta";
      else if (diff <= 30) severidade = "media";
      else if (diff <= 60) severidade = "baixa";
      if (severidade) {
        list.push({
          ...base,
          tipo: df.tipo,
          label: df.label,
          severidade,
          detalhe:
            diff < 0
              ? `Vencido há ${Math.abs(diff)} dia(s)`
              : `Vence em ${diff} dia(s)`,
        });
      }
    }
    if (v.proximo_oleo_km && v.km_atual != null) {
      const restante = Number(v.proximo_oleo_km) - Number(v.km_atual);
      if (restante <= 0) {
        list.push({
          ...base,
          tipo: "oleo",
          label: "Troca de óleo",
          severidade: "alta",
          detalhe: `Atrasada em ${Math.abs(restante).toLocaleString("pt-BR")} km`,
        });
      } else if (restante <= 500) {
        list.push({
          ...base,
          tipo: "oleo",
          label: "Troca de óleo",
          severidade: "media",
          detalhe: `Faltam ${restante.toLocaleString("pt-BR")} km`,
        });
      } else if (restante <= 1000) {
        list.push({
          ...base,
          tipo: "oleo",
          label: "Troca de óleo",
          severidade: "baixa",
          detalhe: `Faltam ${restante.toLocaleString("pt-BR")} km`,
        });
      }
    }
  }
  const rank = { alta: 0, media: 1, baixa: 2 } as const;
  return list.sort((a, b) => rank[a.severidade] - rank[b.severidade]);
}