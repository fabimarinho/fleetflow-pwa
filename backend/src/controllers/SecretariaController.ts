import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { SecretariaService } from "../services/SecretariaService";

const secretariaService = new SecretariaService();

function obterId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

function tratarErroConhecido(
  error: unknown,
  res: Response
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "Secretaria não encontrada.") {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message === "Nome da secretaria é obrigatório." ||
    error.message ===
      "Já existe uma secretaria com este nome." ||
    error.message ===
      "Não é possível excluir uma secretaria que possui registros vinculados."
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return null;
}

export class SecretariaController {
  async listar(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const secretarias = await secretariaService.listar();

      return res.status(200).json({
        success: true,
        data: secretarias,
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
      const id = obterId(req.params.id);

      const secretaria =
        await secretariaService.buscarPorId(id);

      return res.status(200).json({
        success: true,
        data: secretaria,
      });
    } catch (error) {
      const resposta = tratarErroConhecido(error, res);

      if (resposta) {
        return resposta;
      }

      next(error);
    }
  }

  async criar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const secretaria =
        await secretariaService.criar(req.body);

      return res.status(201).json({
        success: true,
        message: "Secretaria cadastrada com sucesso.",
        data: secretaria,
      });
    } catch (error) {
      const resposta = tratarErroConhecido(error, res);

      if (resposta) {
        return resposta;
      }

      next(error);
    }
  }

  async atualizar(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = obterId(req.params.id);

      const secretaria =
        await secretariaService.atualizar(
          id,
          req.body
        );

      return res.status(200).json({
        success: true,
        message: "Secretaria atualizada com sucesso.",
        data: secretaria,
      });
    } catch (error) {
      const resposta = tratarErroConhecido(error, res);

      if (resposta) {
        return resposta;
      }

      next(error);
    }
  }

  async excluir(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = obterId(req.params.id);

      await secretariaService.excluir(id);

      return res.status(200).json({
        success: true,
        message: "Secretaria removida com sucesso.",
      });
    } catch (error) {
      const resposta = tratarErroConhecido(error, res);

      if (resposta) {
        return resposta;
      }

      next(error);
    }
  }
}
