import prisma from "../lib/prisma";
import {
  StatusVeiculo,
} from "@prisma/client";

interface ListarVeiculosParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

interface VeiculoInput {
  placa: string;
  modelo: string;
  marca?: string | null;
  ano?: number | null;
  tipo?: string | null;
  cor?: string | null;
  km_atual?: number;
  secretaria_id?: string | null;
  status?: string;
  observacoes?: string | null;
  proximo_oleo_km?: number | null;
  licenciamento_ate?: string | null;
  ipva_ate?: string | null;
  seguro_ate?: string | null;
}

function statusParaPrisma(
  status?: string
): StatusVeiculo {
  switch (status?.toLowerCase()) {
    case "em_uso":
      return StatusVeiculo.EM_USO;

    case "em_manutencao":
      return StatusVeiculo.EM_MANUTENCAO;

    case "disponivel":
    case undefined:
      return StatusVeiculo.DISPONIVEL;

    default:
      throw new Error("Status do veículo inválido.");
  }
}

function statusParaFrontend(
  status: StatusVeiculo
): string {
  switch (status) {
    case StatusVeiculo.EM_USO:
      return "em_uso";

    case StatusVeiculo.EM_MANUTENCAO:
      return "em_manutencao";

    default:
      return "disponivel";
  }
}

function dataOpcional(
  valor?: string | null
): Date | null {
  if (!valor) {
    return null;
  }

  const data = new Date(`${valor}T00:00:00`);

  if (Number.isNaN(data.getTime())) {
    throw new Error("Data inválida.");
  }

  return data;
}

function formatarData(
  data: Date | null
): string | null {
  if (!data) {
    return null;
  }

  return data.toISOString().slice(0, 10);
}

function formatarVeiculo(veiculo: any) {
  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    marca: veiculo.marca,
    ano: veiculo.ano,
    tipo: veiculo.tipo,
    cor: veiculo.cor,

    km_atual: veiculo.kmAtual,

    status: statusParaFrontend(veiculo.status),

    secretaria_id: veiculo.secretariaId,

    secretarias: veiculo.secretaria
      ? {
          id: veiculo.secretaria.id,
          nome: veiculo.secretaria.nome,
          sigla: veiculo.secretaria.sigla,
        }
      : null,

    observacoes: veiculo.observacoes,

    proximo_oleo_km: veiculo.proximoOleoKm,

    licenciamento_ate: formatarData(
      veiculo.licenciamentoAte
    ),

    ipva_ate: formatarData(
      veiculo.ipvaAte
    ),

    seguro_ate: formatarData(
      veiculo.seguroAte
    ),

    created_at: veiculo.createdAt,
    updated_at: veiculo.updatedAt,
  };
}

export class VeiculoService {
  async listar(params: ListarVeiculosParams) {
    const q = params.q?.trim() || "";

    const page =
      Number.isInteger(params.page) &&
      Number(params.page) >= 0
        ? Number(params.page)
        : 0;

    const pageSize =
      Number.isInteger(params.pageSize) &&
      Number(params.pageSize) > 0
        ? Math.min(Number(params.pageSize), 100)
        : 12;

    const where: any = {};

    if (
      params.status &&
      params.status !== "todos"
    ) {
      where.status = statusParaPrisma(params.status);
    }

    if (q) {
      where.OR = [
        {
          placa: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          modelo: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          marca: {
            contains: q,
            mode: "insensitive",
          },
        },
      ];
    }

    const [veiculos, total] =
      await prisma.$transaction([
        prisma.veiculo.findMany({
          where,
          include: {
            secretaria: {
              select: {
                id: true,
                nome: true,
                sigla: true,
              },
            },
          },
          orderBy: {
            modelo: "asc",
          },
          skip: page * pageSize,
          take: pageSize,
        }),

        prisma.veiculo.count({
          where,
        }),
      ]);

    return {
      rows: veiculos.map(formatarVeiculo),
      total,
      page,
      pageSize,
    };
  }

  async buscarPorId(id: string) {
    const veiculo =
      await prisma.veiculo.findUnique({
        where: { id },
        include: {
          secretaria: {
            select: {
              id: true,
              nome: true,
              sigla: true,
            },
          },
        },
      });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    return formatarVeiculo(veiculo);
  }

  private async validarSecretaria(
    secretariaId?: string | null
  ) {
    if (!secretariaId) {
      return;
    }

    const secretaria =
      await prisma.secretaria.findUnique({
        where: {
          id: secretariaId,
        },
      });

    if (!secretaria) {
      throw new Error(
        "Secretaria informada não existe."
      );
    }
  }

  private validarDados(data: VeiculoInput) {
    const placa = data.placa?.trim().toUpperCase();
    const modelo = data.modelo?.trim();

    if (!placa) {
      throw new Error(
        "Placa do veículo é obrigatória."
      );
    }

    if (placa.length < 5 || placa.length > 10) {
      throw new Error("Placa do veículo inválida.");
    }

    if (!modelo) {
      throw new Error(
        "Modelo do veículo é obrigatório."
      );
    }

    if (
      data.ano != null &&
      (
        !Number.isInteger(Number(data.ano)) ||
        Number(data.ano) < 1900 ||
        Number(data.ano) >
          new Date().getFullYear() + 1
      )
    ) {
      throw new Error("Ano do veículo inválido.");
    }

    if (
      data.km_atual != null &&
      (
        !Number.isFinite(Number(data.km_atual)) ||
        Number(data.km_atual) < 0
      )
    ) {
      throw new Error(
        "Quilometragem do veículo inválida."
      );
    }

    if (
      data.proximo_oleo_km != null &&
      (
        !Number.isFinite(
          Number(data.proximo_oleo_km)
        ) ||
        Number(data.proximo_oleo_km) < 0
      )
    ) {
      throw new Error(
        "Quilometragem da próxima troca de óleo inválida."
      );
    }

    return {
      placa,
      modelo,
    };
  }

  async criar(data: VeiculoInput) {
    const { placa, modelo } =
      this.validarDados(data);

    await this.validarSecretaria(
      data.secretaria_id
    );

    const existente =
      await prisma.veiculo.findFirst({
        where: {
          placa: {
            equals: placa,
            mode: "insensitive",
          },
        },
      });

    if (existente) {
      throw new Error(
        "Já existe um veículo com esta placa."
      );
    }

    const veiculo =
      await prisma.veiculo.create({
        data: {
          placa,
          modelo,

          marca:
            data.marca?.trim() || null,

          ano:
            data.ano != null
              ? Number(data.ano)
              : null,

          tipo:
            data.tipo?.trim() || null,

          cor:
            data.cor?.trim() || null,

          kmAtual:
            data.km_atual != null
              ? Number(data.km_atual)
              : 0,

          secretariaId:
            data.secretaria_id || null,

          status:
            statusParaPrisma(data.status),

          observacoes:
            data.observacoes?.trim() || null,

          proximoOleoKm:
            data.proximo_oleo_km != null
              ? Number(data.proximo_oleo_km)
              : null,

          licenciamentoAte:
            dataOpcional(
              data.licenciamento_ate
            ),

          ipvaAte:
            dataOpcional(data.ipva_ate),

          seguroAte:
            dataOpcional(data.seguro_ate),
        },

        include: {
          secretaria: {
            select: {
              id: true,
              nome: true,
              sigla: true,
            },
          },
        },
      });

    return formatarVeiculo(veiculo);
  }

  async atualizar(
    id: string,
    data: VeiculoInput
  ) {
    await this.buscarPorId(id);

    const { placa, modelo } =
      this.validarDados(data);

    await this.validarSecretaria(
      data.secretaria_id
    );

    const duplicado =
      await prisma.veiculo.findFirst({
        where: {
          placa: {
            equals: placa,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
      });

    if (duplicado) {
      throw new Error(
        "Já existe um veículo com esta placa."
      );
    }

    const veiculo =
      await prisma.veiculo.update({
        where: { id },

        data: {
          placa,
          modelo,

          marca:
            data.marca?.trim() || null,

          ano:
            data.ano != null
              ? Number(data.ano)
              : null,

          tipo:
            data.tipo?.trim() || null,

          cor:
            data.cor?.trim() || null,

          kmAtual:
            data.km_atual != null
              ? Number(data.km_atual)
              : 0,

          secretariaId:
            data.secretaria_id || null,

          status:
            statusParaPrisma(data.status),

          observacoes:
            data.observacoes?.trim() || null,

          proximoOleoKm:
            data.proximo_oleo_km != null
              ? Number(data.proximo_oleo_km)
              : null,

          licenciamentoAte:
            dataOpcional(
              data.licenciamento_ate
            ),

          ipvaAte:
            dataOpcional(data.ipva_ate),

          seguroAte:
            dataOpcional(data.seguro_ate),
        },

        include: {
          secretaria: {
            select: {
              id: true,
              nome: true,
              sigla: true,
            },
          },
        },
      });

    return formatarVeiculo(veiculo);
  }

  async excluir(id: string) {
    await this.buscarPorId(id);

    const vinculos =
      await prisma.veiculo.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              viagens: true,
              abastecimentos: true,
              manutencoes: true,
            },
          },
        },
      });

    if (!vinculos) {
      throw new Error("Veículo não encontrado.");
    }

    const totalVinculos =
      vinculos._count.viagens +
      vinculos._count.abastecimentos +
      vinculos._count.manutencoes;

    if (totalVinculos > 0) {
      throw new Error(
        "Não é possível excluir um veículo que possui registros vinculados."
      );
    }

    await prisma.veiculo.delete({
      where: { id },
    });
  }
}
