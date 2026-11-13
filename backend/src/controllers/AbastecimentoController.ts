import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AbastecimentoService } from "../services/AbastecimentoService";

const service = new AbastecimentoService();

export class AbastecimentoController {
  async listar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const veiculoId =
        typeof req.query.veiculoId === "string"
          ? req.query.veiculoId
          : "";

      if (veiculoId) {
        const limit =
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : 10;

        const registros =
          await service.listarPorVeiculo(
            veiculoId,
            limit
          );

        return res.status(200).json({
          success: true,
          message: "Abastecimentos consultados com sucesso.",
          data: registros,
        });
      }

      const resultado = await service.listar(
        typeof req.query.busca === "string"
          ? req.query.busca
          : "",
        req.query.page !== undefined
          ? Number(req.query.page)
          : 0,
        req.query.pageSize !== undefined
          ? Number(req.query.pageSize)
          : 20
      );

      return res.status(200).json({
        success: true,
        message: "Abastecimentos consultados com sucesso.",
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  async criar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const body = req.body ?? {};

      const abastecimento = await service.criar({
        veiculoId: body.veiculo_id ?? body.veiculoId,
        motoristaId:
          body.motorista_id ?? body.motoristaId ?? null,
        secretariaId:
          body.secretaria_id ?? body.secretariaId ?? null,
        tipoCombustivel:
          body.tipo_combustivel ?? body.tipoCombustivel,
        km: Number(body.km),
        litros: Number(body.litros),
        valorLitro: Number(
          body.valor_litro ?? body.valorLitro
        ),
        formaPagamento:
          body.forma_pagamento ?? body.formaPagamento ?? null,
        empresaConvenio:
          body.empresa_convenio ?? body.empresaConvenio ?? null,
        posto: body.posto ?? null,
        observacoes:
          body.observacoes ?? null,
        cupomUrl:
          body.cupom_url ?? body.cupomUrl ?? null,
      });

      return res.status(201).json({
        success: true,
        message: "Abastecimento cadastrado com sucesso.",
        data: abastecimento,
      });
    } catch (error) {
      next(error);
    }
  }

  async excluir(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await service.excluir(String(req.params.id));

      return res.status(200).json({
        success: true,
        message: "Abastecimento excluído com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }
}
