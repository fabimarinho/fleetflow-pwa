import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth";
import { AgendamentoManutencaoService } from "../services/AgendamentoManutencaoService";

const service = new AgendamentoManutencaoService();

export class AgendamentoManutencaoController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const resultado = await service.listar(
        typeof req.query.q === "string" ? req.query.q : "",
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,
        typeof req.query.veiculoId === "string"
          ? req.query.veiculoId
          : undefined,
        req.query.page !== undefined ? Number(req.query.page) : 0,
        req.query.pageSize !== undefined
          ? Number(req.query.pageSize)
          : 20
      );

      return res.status(200).json({
        success: true,
        message: "Agendamentos consultados com sucesso.",
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = (req as AuthRequest).user;
      const body = req.body ?? {};

      const agendamento = await service.criar({
        veiculoId: body.veiculo_id ?? body.veiculoId,
        tipo: body.tipo,
        descricao: body.descricao,
        oficina: body.oficina,
        dataAgendada: body.data_agendada ?? body.dataAgendada,
        kmPrevisto:
          body.km_previsto === "" || body.km_previsto == null
            ? null
            : Number(body.km_previsto),
        observacoes: body.observacoes,
        userId: usuario?.id ?? null,
      });

      return res.status(201).json({
        success: true,
        message: "Agendamento cadastrado com sucesso.",
        data: agendamento,
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
      const agendamento = await service.atualizarStatus(
        String(req.params.id),
        req.body?.status
      );

      return res.status(200).json({
        success: true,
        message: "Status do agendamento atualizado com sucesso.",
        data: agendamento,
      });
    } catch (error) {
      next(error);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction) {
    try {
      await service.excluir(String(req.params.id));

      return res.status(200).json({
        success: true,
        message: "Agendamento excluído com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }
}
