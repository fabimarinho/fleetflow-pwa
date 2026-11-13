
import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth";
import { ViagemService } from "../services/ViagemService";

const service = new ViagemService();

export class ViagemController {
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

      const pesquisa =
        typeof req.query.q === "string"
          ? req.query.q
          : "";

      const limit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : 100;

      const offset =
        typeof req.query.offset === "string"
          ? Number(req.query.offset)
          : 0;

      const registros = await service.listar(
        veiculoId,
        pesquisa,
        limit,
        offset
      );

      return res.status(200).json({
        success: true,
        message: "Viagens consultadas com sucesso.",
        data: registros,
      });
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const viagem = await service.buscarPorId(
        String(req.params.id)
      );

      return res.status(200).json({
        success: true,
        message: "Viagem consultada com sucesso.",
        data: viagem,
      });
    } catch (error) {
      next(error);
    }
  }

  async criar(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Usuário não identificado.",
        });
      }

      const body = req.body;

      const viagem = await service.criar({
        veiculoId: body.veiculo_id,
        motoristaId: req.user.id,
        secretariaId: body.secretaria_id || null,

        servidorNome: body.servidor_nome,
        servidorMatricula: body.servidor_matricula,

        origem: body.origem,
        destino: body.destino,
        objetivo: body.objetivo,

        kmSaida: Number(body.km_saida),

        fotoHodometroSaidaUrl:
          body.foto_hodometro_saida_url,

        assinaturaUrl: body.assinatura_url,

        checklistSaida: body.checklist_saida,
      });

      return res.status(201).json({
        success: true,
        message: "Viagem iniciada com sucesso.",
        data: viagem,
      });
    } catch (error) {
      next(error);
    }
  }

  async finalizar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const body = req.body || {};

      const viagem = await service.finalizar(
        String(req.params.id),
        {
          kmRetorno: Number(body.km_retorno),
          combustivel: body.combustivel,
          ocorrencias: body.ocorrencias,
          fotoHodometroRetornoUrl:
            body.foto_hodometro_retorno_url,
          checklistRetorno: body.checklist_retorno,
          assinaturaRetornoUrl:
            body.assinatura_retorno_url,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Viagem finalizada com sucesso.",
        data: viagem,
      });
    } catch (error) {
      next(error);
    }
  }
}
