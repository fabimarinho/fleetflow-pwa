import prisma from "../lib/prisma";
import {
  TipoManutencao,
  StatusManutencao,
  StatusVeiculo,
} from "@prisma/client";

const includeRelacionamentos = {
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
      kmAtual: true,
    },
  },
  responsavel: {
    select: {
      id: true,
      nome: true,
    },
  },
};

function tipoParaBanco(tipo: string): TipoManutencao {
  const valor = tipo?.trim().toUpperCase();

  if (
    !Object.values(TipoManutencao).includes(
      valor as TipoManutencao
    )
  ) {
    throw new Error("Tipo de manutenção inválido.");
  }

  return valor as TipoManutencao;
}

function statusParaBanco(status: string): StatusManutencao {
  const valor = status?.trim().toUpperCase();

  if (
    !Object.values(StatusManutencao).includes(
      valor as StatusManutencao
    )
  ) {
    throw new Error("Status da manutenção inválido.");
  }

  return valor as StatusManutencao;
}

function formatarManutencao(manutencao: any) {
  return {
    id: manutencao.id,
    veiculo_id: manutencao.veiculoId,
    tipo: manutencao.tipo.toLowerCase(),
    status: manutencao.status.toLowerCase(),
    descricao: manutencao.descricao,
    oficina: manutencao.oficina,
    km: manutencao.km,
    custo:
      manutencao.custo != null
        ? Number(manutencao.custo)
        : null,
    data_abertura: manutencao.dataAbertura,
    data_conclusao: manutencao.dataConclusao,
    responsavel_id: manutencao.responsavelId,
    observacoes: manutencao.observacoes,
    anexo_url: manutencao.anexoUrl,

    veiculos: manutencao.veiculo
      ? {
          id: manutencao.veiculo.id,
          placa: manutencao.veiculo.placa,
          modelo: manutencao.veiculo.modelo,
          km_atual: manutencao.veiculo.kmAtual,
        }
      : null,

    profiles: manutencao.responsavel
      ? {
          id: manutencao.responsavel.id,
          nome: manutencao.responsavel.nome,
        }
      : null,

    created_at: manutencao.createdAt,
    updated_at: manutencao.updatedAt,
  };
}

export class ManutencaoService {
  async listar(
    busca = "",
    status?: string,
    page = 0,
    pageSize = 20
  ) {
    const pagina =
      Number.isInteger(page) && page >= 0 ? page : 0;

    const tamanho =
      Number.isInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, 100)
        : 20;

    const termo = busca.trim();

    const where: any = {};

    if (status && status !== "todos") {
      where.status = statusParaBanco(status);
    }

    if (termo) {
      where.OR = [
        {
          descricao: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          oficina: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          veiculo: {
            is: {
              placa: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
        {
          veiculo: {
            is: {
              modelo: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const [registros, total] =
      await prisma.$transaction([
        prisma.manutencao.findMany({
          where,
          include: includeRelacionamentos,
          orderBy: {
            dataAbertura: "desc",
          },
          skip: pagina * tamanho,
          take: tamanho,
        }),

        prisma.manutencao.count({
          where,
        }),
      ]);

    return {
      rows: registros.map(formatarManutencao),
      total,
      page: pagina,
      pageSize: tamanho,
    };
  }

  async criar(data: {
    veiculoId: string;
    tipo: string;
    descricao: string;
    oficina?: string | null;
    km?: number | null;
    custo?: number | null;
    observacoes?: string | null;
    responsavelId?: string | null;
  }) {
    if (!data.veiculoId) {
      throw new Error("Veículo é obrigatório.");
    }

    const descricao = data.descricao?.trim();

    if (!descricao) {
      throw new Error("Descrição da manutenção é obrigatória.");
    }

    if (
      data.km != null &&
      (!Number.isFinite(data.km) || data.km < 0)
    ) {
      throw new Error("Quilometragem inválida.");
    }

    if (
      data.custo != null &&
      (!Number.isFinite(data.custo) || data.custo < 0)
    ) {
      throw new Error("Custo da manutenção inválido.");
    }

    const tipo = tipoParaBanco(data.tipo);

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: data.veiculoId,
      },
      select: {
        id: true,
      },
    });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    if (data.responsavelId) {
      const responsavel = await prisma.user.findUnique({
        where: {
          id: data.responsavelId,
        },
        select: {
          id: true,
          ativo: true,
        },
      });

      if (!responsavel || !responsavel.ativo) {
        throw new Error("Usuário responsável não encontrado ou inativo.");
      }
    }

    const criada = await prisma.$transaction(async (tx) => {
      const manutencao = await tx.manutencao.create({
        data: {
          veiculoId: data.veiculoId,
          tipo,
          descricao,
          oficina: data.oficina?.trim() || null,
          km: data.km ?? null,
          custo: data.custo ?? null,
          observacoes: data.observacoes?.trim() || null,
          responsavelId: data.responsavelId || null,
          status: StatusManutencao.ABERTA,
        },
        include: includeRelacionamentos,
      });

      await tx.veiculo.update({
        where: {
          id: data.veiculoId,
        },
        data: {
          status: StatusVeiculo.EM_MANUTENCAO,
        },
      });

      return manutencao;
    });

    return formatarManutencao(criada);
  }

  async atualizarStatus(id: string, statusRecebido: string) {
    if (!id) {
      throw new Error("Manutenção não informada.");
    }

    const status = statusParaBanco(statusRecebido);

    const existente = await prisma.manutencao.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        veiculoId: true,
      },
    });

    if (!existente) {
      throw new Error("Manutenção não encontrada.");
    }

    const atualizada = await prisma.$transaction(async (tx) => {
      const manutencao = await tx.manutencao.update({
        where: {
          id,
        },
        data: {
          status,
          dataConclusao:
            status === StatusManutencao.CONCLUIDA
              ? new Date()
              : null,
        },
        include: includeRelacionamentos,
      });

      await tx.veiculo.update({
        where: {
          id: existente.veiculoId,
        },
        data: {
          status:
            status === StatusManutencao.CONCLUIDA ||
            status === StatusManutencao.CANCELADA
              ? StatusVeiculo.DISPONIVEL
              : StatusVeiculo.EM_MANUTENCAO,
        },
      });

      return manutencao;
    });

    return formatarManutencao(atualizada);
  }

  async excluir(id: string) {
    if (!id) {
      throw new Error("Manutenção não informada.");
    }

    const existente = await prisma.manutencao.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existente) {
      throw new Error("Manutenção não encontrada.");
    }

    await prisma.manutencao.delete({
      where: {
        id,
      },
    });
  }
}
