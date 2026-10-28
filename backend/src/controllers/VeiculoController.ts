import {
  Request,
  Response,
  NextFunction,
} from "express";

import { VeiculoService } from "../services/VeiculoService";

const service = new VeiculoService();

export class VeiculoController {
  async listar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = req.query.page
        ? Number(req.query.page)
        : undefined;

      const pageSize = req.query.pageSize
        ? Number(req.query.pageSize)
        : undefined;

      const resultado = await service.listar({
        q:
          typeof req.query.q === "string"
            ? req.query.q
            : undefined,

        status:
          typeof req.query.status === "string"
            ? req.query.status
            : undefined,

        page,
        pageSize,
      });

      return res.status(200).json({
        success: true,
        message: "Veículos consultados com sucesso.",
        data: resultado,
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
      const veiculo = await service.buscarPorId(
        String(req.params.id)
      );

      return res.status(200).json({
        success: true,
        message: "Veículo consultado com sucesso.",
        data: veiculo,
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
      const veiculo = await service.criar(req.body);

      return res.status(201).json({
        success: true,
        message: "Veículo cadastrado com sucesso.",
        data: veiculo,
      });
    } catch (error) {
      next(error);
    }
  }

  async atualizar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const veiculo = await service.atualizar(
        String(req.params.id),
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Veículo atualizado com sucesso.",
        data: veiculo,
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
        message: "Veículo excluído com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }
}
