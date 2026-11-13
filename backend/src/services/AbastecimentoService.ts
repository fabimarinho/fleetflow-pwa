import prisma from "../lib/prisma";
import {
  TipoCombustivel,
  FormaPagamentoAbastecimento,
} from "@prisma/client";

function tipoParaFrontend(tipo: TipoCombustivel): string {
  return tipo.toLowerCase();
}

function tipoParaBanco(tipo: string): TipoCombustivel {
  const valor = tipo.trim().toUpperCase();

  if (
    !Object.values(TipoCombustivel).includes(
      valor as TipoCombustivel
    )
  ) {
    throw new Error("Tipo de combustível inválido.");
  }

  return valor as TipoCombustivel;
}

function pagamentoParaBanco(
  pagamento?: string | null
): FormaPagamentoAbastecimento | null {
  if (!pagamento) {
    return null;
  }

  const valor = pagamento.trim().toUpperCase();

  if (
    !Object.values(FormaPagamentoAbastecimento).includes(
      valor as FormaPagamentoAbastecimento
    )
  ) {
    throw new Error("Forma de pagamento inválida.");
  }

  return valor as FormaPagamentoAbastecimento;
}

function formatarAbastecimento(abastecimento: any) {
  return {
    id: abastecimento.id,

    veiculo_id: abastecimento.veiculoId,
    motorista_id: abastecimento.motoristaId,
    secretaria_id: abastecimento.secretariaId,

    data: abastecimento.data,
    km: abastecimento.km,

    tipo_combustivel: tipoParaFrontend(
      abastecimento.tipoCombustivel
    ),

    litros: Number(abastecimento.litros),
    valor_litro: Number(abastecimento.valorLitro),
    valor_total: Number(abastecimento.valorTotal),

    forma_pagamento:
      abastecimento.formaPagamento?.toLowerCase() ?? null,
    empresa_convenio: abastecimento.empresaConvenio ?? null,

    posto: abastecimento.posto,
    observacoes: abastecimento.observacoes,
    cupom_url: abastecimento.cupomUrl,

    veiculos: abastecimento.veiculo
      ? {
          id: abastecimento.veiculo.id,
          placa: abastecimento.veiculo.placa,
          modelo: abastecimento.veiculo.modelo,
          marca: abastecimento.veiculo.marca,
          km_atual: abastecimento.veiculo.kmAtual,
        }
      : null,

    profiles: abastecimento.motorista
      ? {
          id: abastecimento.motorista.id,
          nome: abastecimento.motorista.nome,
        }
      : null,

    secretarias: abastecimento.secretaria
      ? {
          id: abastecimento.secretaria.id,
          nome: abastecimento.secretaria.nome,
          sigla: abastecimento.secretaria.sigla,
        }
      : null,

    created_at: abastecimento.createdAt,
    updated_at: abastecimento.updatedAt,
  };
}

const includeRelacionamentos = {
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
      marca: true,
      kmAtual: true,
    },
  },

  motorista: {
    select: {
      id: true,
      nome: true,
    },
  },

  secretaria: {
    select: {
      id: true,
      nome: true,
      sigla: true,
    },
  },
};

export class AbastecimentoService {
  async listar(
    busca = "",
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

    const where = termo
      ? {
          OR: [
            {
              posto: {
                contains: termo,
                mode: "insensitive" as const,
              },
            },
            {
              veiculo: {
                is: {
                  placa: {
                    contains: termo,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              veiculo: {
                is: {
                  modelo: {
                    contains: termo,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              motorista: {
                is: {
                  nome: {
                    contains: termo,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {};

    const [registros, total] =
      await prisma.$transaction([
        prisma.abastecimento.findMany({
          where,
          include: includeRelacionamentos,
          orderBy: {
            data: "desc",
          },
          skip: pagina * tamanho,
          take: tamanho,
        }),

        prisma.abastecimento.count({
          where,
        }),
      ]);

    return {
      rows: registros.map(formatarAbastecimento),
      total,
      page: pagina,
      pageSize: tamanho,
    };
  }

  async listarPorVeiculo(
    veiculoId: string,
    limit = 10
  ) {
    if (!veiculoId) {
      throw new Error(
        "Veículo é obrigatório para consultar os abastecimentos."
      );
    }

    const limite =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 10;

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: veiculoId,
      },
      select: {
        id: true,
      },
    });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    const abastecimentos =
      await prisma.abastecimento.findMany({
        where: {
          veiculoId,
        },

        include: includeRelacionamentos,

        orderBy: {
          data: "desc",
        },

        take: limite,
      });

    return abastecimentos.map(formatarAbastecimento);
  }

  async criar(data: {
    veiculoId: string;
    motoristaId?: string | null;
    secretariaId?: string | null;
    tipoCombustivel: string;
    km: number;
    litros: number;
    valorLitro: number;
    formaPagamento?: string | null;
    empresaConvenio?: string | null;
    posto?: string | null;
    observacoes?: string | null;
    cupomUrl?: string | null;
  }) {
    if (!data.veiculoId) {
      throw new Error("Veículo é obrigatório.");
    }

    if (!Number.isFinite(data.km) || data.km < 0) {
      throw new Error("Quilometragem inválida.");
    }

    if (
      !Number.isFinite(data.litros) ||
      data.litros <= 0
    ) {
      throw new Error("Quantidade de litros inválida.");
    }

    if (
      !Number.isFinite(data.valorLitro) ||
      data.valorLitro <= 0
    ) {
      throw new Error("Valor por litro inválido.");
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: data.veiculoId,
      },
    });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    if (data.motoristaId) {
      const motorista = await prisma.user.findUnique({
        where: {
          id: data.motoristaId,
        },
        select: {
          id: true,
          ativo: true,
        },
      });

      if (!motorista || !motorista.ativo) {
        throw new Error("Motorista não encontrado ou inativo.");
      }
    }

    if (data.secretariaId) {
      const secretaria =
        await prisma.secretaria.findUnique({
          where: {
            id: data.secretariaId,
          },
          select: {
            id: true,
            ativa: true,
          },
        });

      if (!secretaria || !secretaria.ativa) {
        throw new Error("Secretaria não encontrada ou inativa.");
      }
    }

    const tipoCombustivel = tipoParaBanco(
      data.tipoCombustivel
    );

    const formaPagamento = pagamentoParaBanco(
      data.formaPagamento
    );

    const empresaConvenio =
      data.empresaConvenio?.trim() || null;

    if (
      formaPagamento ===
      FormaPagamentoAbastecimento.FATURADO_CONVENIO &&
      !empresaConvenio
    ) {
      throw new Error(
        "Informe a empresa ou o convênio do abastecimento."
      );
    }

    const valorTotal =
      Math.round(
        data.litros * data.valorLitro * 100
      ) / 100;

    const abastecimento =
      await prisma.$transaction(async (tx) => {
        const criado =
          await tx.abastecimento.create({
            data: {
              veiculoId: data.veiculoId,
              motoristaId:
                data.motoristaId || null,
              secretariaId:
                data.secretariaId || null,

              tipoCombustivel,
              km: data.km,
              litros: data.litros,
              valorLitro: data.valorLitro,
              valorTotal,

              formaPagamento,
              empresaConvenio:
                formaPagamento ===
                FormaPagamentoAbastecimento.FATURADO_CONVENIO
                  ? empresaConvenio
                  : null,

              posto: data.posto?.trim() || null,
              observacoes:
                data.observacoes?.trim() || null,
              cupomUrl: data.cupomUrl || null,
            },

            include: includeRelacionamentos,
          });

        if (data.km > veiculo.kmAtual) {
          await tx.veiculo.update({
            where: {
              id: data.veiculoId,
            },
            data: {
              kmAtual: data.km,
            },
          });
        }

        return criado;
      });

    return formatarAbastecimento(abastecimento);
  }

  async excluir(id: string) {
    if (!id) {
      throw new Error(
        "Abastecimento é obrigatório."
      );
    }

    const existente =
      await prisma.abastecimento.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existente) {
      throw new Error(
        "Abastecimento não encontrado."
      );
    }

    await prisma.abastecimento.delete({
      where: {
        id,
      },
    });
  }
}
