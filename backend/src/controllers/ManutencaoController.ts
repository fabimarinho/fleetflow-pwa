import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth";
import { ManutencaoService } from "../services/ManutencaoService";

const service = new ManutencaoService();

export class ManutencaoController {
  async listar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const resultado = await service.listar(
        typeof req.query.q === "string"
          ? req.query.q
          : "",
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,
        req.query.page !== undefined
          ? Number(req.query.page)
          : 0,
        req.query.pageSize !== undefined
          ? Number(req.query.pageSize)
          : 20
      );

      return res.status(200).json({
        success: true,
        message: "Manutenções consultadas com sucesso.",
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
      const usuario = (req as AuthRequest).user;
      const body = req.body ?? {};

      const manutencao = await service.criar({
        veiculoId: body.veiculo_id ?? body.veiculoId,
        tipo: body.tipo,
        descricao: body.descricao,
        oficina: body.oficina,
        km:
          body.km === "" || body.km == null
            ? null
            : Number(body.km),
        custo:
          body.custo === "" || body.custo == null
            ? null
            : Number(body.custo),
        observacoes: body.observacoes,
        responsavelId: usuario?.id ?? null,
      });

      return res.status(201).json({
        success: true,
        message: "Manutenção cadastrada com sucesso.",
        data: manutencao,
      });
    } catch (error) {
      next(error);
    }
  }

  async atualizarStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const manutencao = await service.atualizarStatus(
        String(req.params.id),
        req.body?.status
      );

      return res.status(200).json({
        success: true,
        message: "Status da manutenção atualizado com sucesso.",
        data: manutencao,
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
        message: "Manutenção excluída com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }
}
