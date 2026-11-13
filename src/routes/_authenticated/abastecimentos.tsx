import { createFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Fuel,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/abastecimentos")({
  component: AbastecimentosPage,
});

const COMBUSTIVEIS: { value: string; label: string }[] = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_s10", label: "Diesel S10" },
  { value: "gnv", label: "GNV" },
  { value: "flex", label: "Flex" },
];

const FORMAS_PAGAMENTO: { value: string; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "faturado_convenio", label: "Faturado / Convênio" },
];

interface RespostaApi<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  km_atual?: number;
  kmAtual?: number;
}

interface Secretaria {
  id: string;
  nome: string;
  sigla?: string | null;
}

interface Abastecimento {
  id: string;
  data: string;
  km: number;
  tipo_combustivel: string;
  litros: number | string;
  valor_litro: number | string;
  valor_total: number | string;
  forma_pagamento?: string | null;
  empresa_convenio?: string | null;
  posto?: string | null;
  observacoes?: string | null;
  veiculos?: {
    id?: string;
    placa?: string;
    modelo?: string;
  } | null;
  profiles?: {
    nome?: string;
  } | null;
}

interface ListaAbastecimentos {
  rows: Abastecimento[];
  total: number;
  page: number;
  pageSize: number;
}

function AbastecimentosPage() {
  const { data: me } = useProfile();
  const podeExcluir = me?.role === "administrador";
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Abastecimento | null>(null);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const buscaDeb = useDebounced(busca, 300);

  const [excluir, setExcluir] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [form, setForm] = useState({
    veiculo_id: "",
    secretaria_id: "",
    tipo_combustivel: "gasolina",
    km: "",
    litros: "",
    valor_litro: "",
    forma_pagamento: "",
    empresa_convenio: "",
    posto: "",
    observacoes: "",
  });

  const { data: resultado, isLoading, isError, error } = useQuery({
    queryKey: [
      "abastecimentos",
      { q: buscaDeb, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        busca: buscaDeb.trim(),
        page: String(page),
        pageSize: String(pageSize),
      });

      const response =
        await apiRequest<RespostaApi<ListaAbastecimentos>>(
          `/abastecimentos?${params.toString()}`
        );

      return response.data;
    },
  });

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-all"],
    queryFn: async () => {
      const response = await apiRequest<
        RespostaApi<
          Veiculo[] | { rows?: Veiculo[]; data?: Veiculo[] }
        >
      >("/veiculos?page=0&pageSize=100");

      const dados = response.data;

      if (Array.isArray(dados)) {
        return dados;
      }

      if (Array.isArray(dados.rows)) {
        return dados.rows;
      }

      if (Array.isArray(dados.data)) {
        return dados.data;
      }

      return [];
    },
  });

  const { data: secretarias = [] } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => {
      const response =
        await apiRequest<RespostaApi<Secretaria[]>>(
          "/secretarias"
        );

      return Array.isArray(response.data)
        ? response.data
        : [];
    },
  });

  const totalCalc =
    Number(form.litros || 0) *
      Number(form.valor_litro || 0) || 0;

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.veiculo_id) {
        throw new Error("Selecione um veículo.");
      }

      if (
        !form.km ||
        !Number.isFinite(Number(form.km)) ||
        Number(form.km) < 0
      ) {
        throw new Error("Informe uma quilometragem válida.");
      }

      if (
        !form.litros ||
        !Number.isFinite(Number(form.litros)) ||
        Number(form.litros) <= 0
      ) {
        throw new Error("Informe a quantidade de litros.");
      }

      if (
        !form.valor_litro ||
        !Number.isFinite(Number(form.valor_litro)) ||
        Number(form.valor_litro) <= 0
      ) {
        throw new Error("Informe um valor por litro válido.");
      }

      if (!form.forma_pagamento) {
        throw new Error("Selecione a forma de pagamento.");
      }

      if (
        form.forma_pagamento === "faturado_convenio" &&
        !form.empresa_convenio.trim()
      ) {
        throw new Error("Informe a empresa ou convênio.");
      }

      const response =
        await apiRequest<RespostaApi<Abastecimento>>(
          "/abastecimentos",
          {
            method: "POST",
            body: JSON.stringify({
              veiculo_id: form.veiculo_id,
              motorista_id: me?.user?.id ?? null,
              secretaria_id: form.secretaria_id || null,
              tipo_combustivel: form.tipo_combustivel,
              km: Number(form.km),
              litros: Number(form.litros),
              valor_litro: Number(form.valor_litro),
              forma_pagamento: form.forma_pagamento,
              empresa_convenio:
                form.forma_pagamento === "faturado_convenio"
                  ? form.empresa_convenio.trim()
                  : null,
              posto: form.posto.trim() || null,
              observacoes: form.observacoes.trim() || null,
              cupom_url: null,
            }),
          }
        );

      return response.data;
    },

    onSuccess: () => {
      toast.success("Abastecimento registrado.");
      qc.invalidateQueries({
        queryKey: ["abastecimentos"],
      });
      qc.invalidateQueries({
        queryKey: ["veiculos-all"],
      });

      setOpen(false);
      setForm({
        veiculo_id: "",
        secretaria_id: "",
        tipo_combustivel: "gasolina",
        km: "",
        litros: "",
        valor_litro: "",
        forma_pagamento: "",
        empresa_convenio: "",
        posto: "",
        observacoes: "",
      });
    },

    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest<RespostaApi<null>>(
        `/abastecimentos/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    onSuccess: () => {
      toast.success("Abastecimento excluído.");
      qc.invalidateQueries({
        queryKey: ["abastecimentos"],
      });
      setExcluir(null);
    },

    onError: (e: Error) => {
      toast.error(e.message);
      setExcluir(null);
    },
  });

  const filtrados = resultado?.rows ?? [];
  const total = resultado?.total ?? 0;

  function dataFormatada(data: string) {
    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
      return "—";
    }

    return format(dataObj, "dd/MM/yy HH:mm", {
      locale: ptBR,
    });
  }

  function rotuloRegistro(r: Abastecimento) {
    return `${r.veiculos?.placa ?? "Veículo"} · ${dataFormatada(r.data)}`;
  }

  function combustivelFormatado(tipo: string) {
    return (
      COMBUSTIVEIS.find((c) => c.value === tipo)?.label ??
      String(tipo).replaceAll("_", " ")
    );
  }

  function pagamentoFormatado(forma?: string | null) {
    if (!forma) {
      return "Não informado";
    }

    return (
      FORMAS_PAGAMENTO.find((p) => p.value === forma)?.label ??
      String(forma).replaceAll("_", " ")
    );
  }

  function moeda(valor: number | string) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Abastecimentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de combustível por veículo
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo abastecimento
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Registrar abastecimento
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Veículo *</Label>
                <Select
                  value={form.veiculo_id}
                  onValueChange={(v) => {
                    const sel = veiculos.find(
                      (x) => x.id === v
                    );

                    setForm({
                      ...form,
                      veiculo_id: v,
                      km: sel
                        ? String(
                            sel.km_atual ??
                              sel.kmAtual ??
                              0
                          )
                        : "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                      >
                        {v.modelo} · {v.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Combustível *</Label>
                <Select
                  value={form.tipo_combustivel}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      tipo_combustivel: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMBUSTIVEIS.map((c) => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Km *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.km}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      km: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Litros *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.litros}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      litros: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Valor por litro (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_litro}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valor_litro: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Total</Label>
                <Input
                  disabled
                  value={`R$ ${totalCalc.toFixed(2)}`}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Posto</Label>
                <Input
                  value={form.posto}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      posto: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Forma de pagamento *</Label>
                <Select
                  value={form.forma_pagamento}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      forma_pagamento: v,
                      empresa_convenio:
                        v === "faturado_convenio"
                          ? form.empresa_convenio
                          : "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((p) => (
                      <SelectItem
                        key={p.value}
                        value={p.value}
                      >
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.forma_pagamento === "faturado_convenio" && (
                <div className="col-span-2 space-y-1">
                  <Label>Empresa / Convênio *</Label>
                  <Input
                    value={form.empresa_convenio}
                    placeholder="Informe o nome da empresa ou convênio"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        empresa_convenio: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="col-span-2 space-y-1">
                <Label>Secretaria</Label>
                <Select
                  value={form.secretaria_id}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      secretaria_id: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {secretarias.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                      >
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacoes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-span-2 rounded-md border p-3 text-sm text-muted-foreground">
                O envio da foto do cupom estará disponível
                quando a API própria de arquivos for implementada.
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  !form.veiculo_id ||
                  !form.km ||
                  !form.litros ||
                  !form.valor_litro ||
                  !form.forma_pagamento ||
                  (form.forma_pagamento === "faturado_convenio" &&
                    !form.empresa_convenio.trim()) ||
                  createMut.isPending
                }
                onClick={() => createMut.mutate()}
                className="bg-brand-green hover:bg-brand-green/90 text-white"
              >
                {createMut.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por veículo, motorista ou posto"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(0);
            }}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {total} resultado(s)
        </span>
      </Card>

      {isError && (
        <Card className="p-4 text-sm text-destructive">
          Não foi possível carregar os abastecimentos:{" "}
          {error instanceof Error
            ? error.message
            : "Erro desconhecido."}
        </Card>
      )}

      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground">
          Carregando abastecimentos...
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          <Card className="p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Veículo</th>
                  <th className="text-left p-3">Motorista</th>
                  <th className="text-left p-3">Combustível</th>
                  <th className="text-right p-3">Km</th>
                  <th className="text-right p-3">Litros</th>
                  <th className="text-right p-3">R$/L</th>
                  <th className="text-right p-3">Total</th>
                  {podeExcluir && (
                    <th className="p-3 w-10" />
                  )}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetalhe(r)}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    title="Clique para ver os detalhes"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {dataFormatada(r.data)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {r.veiculos?.modelo ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {r.veiculos?.placa ?? "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      {r.profiles?.nome ?? "—"}
                    </td>
                    <td className="p-3 capitalize">
                      {combustivelFormatado(r.tipo_combustivel)}
                    </td>
                    <td className="p-3 text-right">
                      {Number(r.km).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 text-right">
                      {Number(r.litros).toFixed(2)}
                    </td>
                    <td className="p-3 text-right">
                      R$ {Number(r.valor_litro).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      R$ {Number(r.valor_total).toFixed(2)}
                    </td>
                    {podeExcluir && (
                      <td className="p-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExcluir({
                              id: r.id,
                              label: rotuloRegistro(r),
                            });
                          }}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeExcluir ? 9 : 8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {total === 0 && !buscaDeb
                        ? "Nenhum abastecimento."
                        : "Nenhum resultado para essa busca."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-3 md:hidden">
            {filtrados.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setDetalhe(r)}
                    aria-label={`Ver detalhes do abastecimento ${rotuloRegistro(r)}`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
                      <Fuel className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {r.veiculos?.modelo ?? "—"} ·{" "}
                        {r.veiculos?.placa ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dataFormatada(r.data)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.profiles?.nome ?? "Motorista não informado"}
                      </p>
                      <p className="mt-1 text-xs text-brand-green">
                        Toque para ver detalhes
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold">
                        R$ {Number(r.valor_total).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(r.litros).toFixed(2)} L
                      </p>
                    </div>
                  </button>

                  {podeExcluir && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() =>
                        setExcluir({
                          id: r.id,
                          label: rotuloRegistro(r),
                        })
                      }
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPage={setPage}
          />
        </>
      )}

      <Dialog
        open={!!detalhe}
        onOpenChange={(o) => !o && setDetalhe(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do abastecimento
            </DialogTitle>
          </DialogHeader>

          {detalhe && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Veículo
                </p>
                <p className="font-semibold">
                  {detalhe.veiculos?.modelo ?? "—"}
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  {detalhe.veiculos?.placa ?? "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Data
                  </p>
                  <p className="font-medium">
                    {dataFormatada(detalhe.data)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Motorista
                  </p>
                  <p className="font-medium">
                    {detalhe.profiles?.nome ?? "Não informado"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Combustível
                  </p>
                  <p className="font-medium">
                    {combustivelFormatado(detalhe.tipo_combustivel)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Quilometragem
                  </p>
                  <p className="font-medium">
                    {Number(detalhe.km).toLocaleString("pt-BR")} km
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Quantidade
                  </p>
                  <p className="font-medium">
                    {Number(detalhe.litros).toFixed(2)} litros
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Valor por litro
                  </p>
                  <p className="font-medium">
                    {moeda(detalhe.valor_litro)}
                  </p>
                </div>

                <div className="col-span-2 rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Valor total
                  </p>
                  <p className="text-xl font-bold">
                    {moeda(detalhe.valor_total)}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Forma de pagamento
                  </p>
                  <p className="font-medium">
                    {pagamentoFormatado(detalhe.forma_pagamento)}
                  </p>
                </div>

                {detalhe.forma_pagamento === "faturado_convenio" && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Empresa / Convênio
                    </p>
                    <p className="font-medium">
                      {detalhe.empresa_convenio || "Não informado"}
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Posto
                  </p>
                  <p className="font-medium">
                    {detalhe.posto || "Não informado"}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Observações
                  </p>
                  <p className="font-medium whitespace-pre-wrap break-words">
                    {detalhe.observacoes || "Nenhuma observação registrada."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDetalhe(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir abastecimento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro{" "}
              <strong>{excluir?.label}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                excluir && deleteMut.mutate(excluir.id)
              }
            >
              {deleteMut.isPending
                ? "Excluindo..."
                : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
