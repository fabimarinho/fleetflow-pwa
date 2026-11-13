
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Car,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/useProfile";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/veiculos/")({
  component: VeiculosPage,
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponivel",
  em_uso: "Em uso",
  em_manutencao: "Em manutencao",
};

const emptyForm = {
  placa: "",
  modelo: "",
  marca: "",
  ano: "",
  tipo: "",
  km_atual: "0",
  secretaria_id: "",
  status: "disponivel" as "disponivel" | "em_uso" | "em_manutencao",
  proximo_oleo_km: "",
  licenciamento_ate: "",
  ipva_ate: "",
  seguro_ate: "",
};

const veiculoSchema = z.object({
  placa: z.string().trim().min(5, "Placa invalida").max(10, "Placa invalida"),
  modelo: z.string().trim().min(1, "Informe o modelo").max(80),
  ano: z.string().refine(
    (value) =>
      value === "" ||
      (Number(value) >= 1900 &&
        Number(value) <= new Date().getFullYear() + 1),
    "Ano invalido",
  ),
  km_atual: z.string().refine(
    (value) => !isNaN(Number(value)) && Number(value) >= 0,
    "Km invalido",
  ),
});

function VeiculosPage() {
  const { data: me } = useProfile();
  const podeEditar = !!me?.isAdmin;
  const podeExcluir = me?.role === "administrador";
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [excluir, setExcluir] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const pageSize = 12;
  const buscaDeb = useDebounced(busca, 300);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos", { q: buscaDeb, status: filtroStatus, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const term = buscaDeb.trim();

      if (term) {
        params.set("q", term);
      }

      if (filtroStatus !== "todos") {
        params.set("status", filtroStatus);
      }

      const response = await apiRequest<any>(
        `/veiculos?${params.toString()}`,
      );

      return response.data;
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => {
      const response = await apiRequest<any>("/secretarias");
      return response.data ?? [];
    },
  });

  const veiculoTeste = {
    id: "demo-veiculo",
    placa: "ABC-1234",
    modelo: "Fiat Strada",
    marca: "Fiat",
    ano: 2024,
    tipo: "Pickup",
    km_atual: 12500,
    secretaria_id: null,
    status: "disponivel",
    secretarias: { nome: "Cadastro de teste" },
    isDemo: true,
  };

  function abrirNovo() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function preencherTeste() {
    setForm({
      ...emptyForm,
      placa: "ABC-1234",
      modelo: "Fiat Strada",
      marca: "Fiat",
      ano: "2024",
      tipo: "Pickup",
      km_atual: "12500",
      status: "disponivel",
    });
  }

  function abrirEdicao(veiculo: any) {
    setEditId(veiculo.id);

    setForm({
      placa: veiculo.placa ?? "",
      modelo: veiculo.modelo ?? "",
      marca: veiculo.marca ?? "",
      ano: veiculo.ano ? String(veiculo.ano) : "",
      tipo: veiculo.tipo ?? "",
      km_atual: String(veiculo.km_atual ?? 0),
      secretaria_id: veiculo.secretaria_id ?? "",
      status: veiculo.status ?? "disponivel",
      proximo_oleo_km: veiculo.proximo_oleo_km
        ? String(veiculo.proximo_oleo_km)
        : "",
      licenciamento_ate: veiculo.licenciamento_ate ?? "",
      ipva_ate: veiculo.ipva_ate ?? "",
      seguro_ate: veiculo.seguro_ate ?? "",
    });

    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const parsed = veiculoSchema.safeParse(form);

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0].message);
      }

      const payload = {
        placa: form.placa.toUpperCase().trim(),
        modelo: form.modelo.trim(),
        marca: form.marca || null,
        ano: form.ano ? Number(form.ano) : null,
        tipo: form.tipo || null,
        km_atual: Number(form.km_atual) || 0,
        secretaria_id: form.secretaria_id || null,
        status: form.status,
        proximo_oleo_km: form.proximo_oleo_km
          ? Number(form.proximo_oleo_km)
          : null,
        licenciamento_ate: form.licenciamento_ate || null,
        ipva_ate: form.ipva_ate || null,
        seguro_ate: form.seguro_ate || null,
      };

      if (editId) {
        await apiRequest(`/veiculos/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/veiculos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },

    onSuccess: () => {
      toast.success(
        editId ? "Veiculo atualizado" : "Veiculo cadastrado",
      );

      setOpen(false);
      setEditId(null);
      setForm(emptyForm);

      qc.invalidateQueries({
        queryKey: ["veiculos"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/veiculos/${id}`, {
        method: "DELETE",
      });
    },

    onSuccess: () => {
      toast.success("Veiculo excluido");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      setExcluir(null);
    },

    onError: (error: Error) => {
      toast.error(
        error.message.includes("foreign")
          ? "Existem registros vinculados a este veiculo."
          : error.message,
      );
      setExcluir(null);
    },
  });

  const hasFilters = !!buscaDeb.trim() || filtroStatus !== "todos";
  const dbRows = veiculos?.rows ?? [];
  const filtrados =
    dbRows.length === 0 && !hasFilters ? [veiculoTeste] : dbRows;
  const total =
    dbRows.length === 0 && !hasFilters ? 1 : (veiculos?.total ?? 0);

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* CABECALHO */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Veiculos</h1>
          <p className="text-sm text-muted-foreground">
            Frota cadastrada
          </p>
        </div>

        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full sm:w-auto"
                onClick={abrirNovo}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo veiculo
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Editar veiculo" : "Cadastrar veiculo"}
                </DialogTitle>
              </DialogHeader>

              {!editId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={preencherTeste}
                >
                  Preencher cadastro teste
                </Button>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();

                  if (
                    form.placa &&
                    form.modelo &&
                    !saveMut.isPending
                  ) {
                    saveMut.mutate();
                  }
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Placa *</Label>
                    <Input
                      value={form.placa}
                      onChange={(e) =>
                        setForm({ ...form, placa: e.target.value })
                      }
                      placeholder="ABC-1234"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Modelo *</Label>
                    <Input
                      value={form.modelo}
                      onChange={(e) =>
                        setForm({ ...form, modelo: e.target.value })
                      }
                      placeholder="Fiat Strada"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Marca</Label>
                    <Input
                      value={form.marca}
                      onChange={(e) =>
                        setForm({ ...form, marca: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={form.ano}
                      onChange={(e) =>
                        setForm({ ...form, ano: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Input
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      placeholder="Pickup, Sedan..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Km atual</Label>
                    <Input
                      type="number"
                      value={form.km_atual}
                      onChange={(e) =>
                        setForm({ ...form, km_atual: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-span-1 space-y-1 sm:col-span-2">
                    <Label>Secretaria responsavel</Label>
                    <Select
                      value={form.secretaria_id}
                      onValueChange={(value) =>
                        setForm({ ...form, secretaria_id: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>

                      <SelectContent>
                        {(secretarias ?? []).map((secretaria: any) => (
                          <SelectItem
                            key={secretaria.id}
                            value={secretaria.id}
                          >
                            {secretaria.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 space-y-1 sm:col-span-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: any) =>
                        setForm({ ...form, status: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="disponivel">
                          Disponivel
                        </SelectItem>
                        <SelectItem value="em_uso">
                          Em uso
                        </SelectItem>
                        <SelectItem value="em_manutencao">
                          Em manutencao
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 border-t pt-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Alertas e agenda
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label>Proxima troca oleo (km)</Label>
                    <Input
                      type="number"
                      value={form.proximo_oleo_km}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          proximo_oleo_km: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Licenciamento ate</Label>
                    <Input
                      type="date"
                      value={form.licenciamento_ate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          licenciamento_ate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>IPVA ate</Label>
                    <Input
                      type="date"
                      value={form.ipva_ate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ipva_ate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Seguro ate</Label>
                    <Input
                      type="date"
                      value={form.seguro_ate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          seguro_ate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter className="mt-5 flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={
                      !form.placa ||
                      !form.modelo ||
                      saveMut.isPending
                    }
                  >
                    {saveMut.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* BUSCA E FILTROS */}
      <Card className="flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative w-full min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Buscar por placa, modelo ou marca"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(0);
            }}
            className="w-full pl-8"
          />
        </div>

        <Select
          value={filtroStatus}
          onValueChange={(value) => {
            setFiltroStatus(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="disponivel">Disponivel</SelectItem>
            <SelectItem value="em_uso">Em uso</SelectItem>
            <SelectItem value="em_manutencao">
              Em manutencao
            </SelectItem>
          </SelectContent>
        </Select>

        <span className="text-right text-xs text-muted-foreground sm:ml-auto">
          {total} resultado(s)
        </span>
      </Card>

      {/* CARTOES DOS VEICULOS */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {filtrados.map((veiculo: any) => (
          <Card
            key={veiculo.id}
            className="min-w-0 p-4 sm:p-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl sm:h-12 sm:w-12 ${
                  veiculo.status === "em_manutencao"
                    ? "bg-brand-orange/10 text-brand-orange"
                    : veiculo.status === "em_uso"
                      ? "bg-brand-green/10 text-brand-green"
                      : "bg-brand-blue/10 text-brand-blue"
                }`}
              >
                {veiculo.status === "em_manutencao" ? (
                  <Wrench className="h-6 w-6" />
                ) : (
                  <Car className="h-6 w-6" />
                )}
              </div>

              {veiculo.isDemo ? (
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">
                    {veiculo.modelo}
                  </h3>

                  <p className="break-words text-xs text-muted-foreground">
                    {veiculo.marca}{" "}
                    {veiculo.ano ? `- ${veiculo.ano}` : ""}
                  </p>

                  <p className="mt-1 font-mono text-sm">
                    {veiculo.placa}
                  </p>
                </div>
              ) : (
                <Link
                  to="/veiculos/$id"
                  params={{ id: veiculo.id }}
                  className="group min-w-0 flex-1"
                >
                  <h3 className="truncate font-semibold">
                    {veiculo.modelo}
                  </h3>

                  <p className="break-words text-xs text-muted-foreground">
                    {veiculo.marca}{" "}
                    {veiculo.ano ? `- ${veiculo.ano}` : ""}
                  </p>

                  <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm">
                    {veiculo.placa}
                    <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                  </p>
                </Link>
              )}

              {podeEditar && !veiculo.isDemo && (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => abrirEdicao(veiculo)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  {podeExcluir && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() =>
                        setExcluir({
                          id: veiculo.id,
                          label: `${veiculo.modelo} - ${veiculo.placa}`,
                        })
                      }
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">
                {STATUS_LABEL[veiculo.status] ?? veiculo.status}
              </Badge>

              {veiculo.isDemo && (
                <Badge className="bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/20">
                  Teste
                </Badge>
              )}

              <span className="text-muted-foreground">
                {veiculo.km_atual?.toLocaleString("pt-BR")} km
              </span>

              {veiculo.secretarias?.nome && (
                <span className="break-words text-muted-foreground">
                  - {veiculo.secretarias.nome}
                </span>
              )}
            </div>
          </Card>
        ))}

        {filtrados.length === 0 && (
          <Card className="col-span-full p-6 text-center text-muted-foreground sm:p-8">
            {total === 0 && !buscaDeb && filtroStatus === "todos"
              ? `Nenhum veiculo cadastrado${podeEditar ? ' ainda. Clique em "Novo veiculo" para comecar.' : "."}`
              : "Nenhum veiculo encontrado com esses filtros."}
          </Card>
        )}
      </div>

      {/* PAGINACAO */}
      <div className="min-w-0 overflow-x-auto">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
        />
      </div>

      {/* CONFIRMACAO DE EXCLUSAO */}
      <AlertDialog
        open={!!excluir}
        onOpenChange={(isOpen) => !isOpen && setExcluir(null)}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir veiculo?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O veiculo{" "}
              <strong>{excluir?.label}</strong> sera removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              onClick={() =>
                excluir && deleteMut.mutate(excluir.id)
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
