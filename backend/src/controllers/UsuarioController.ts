import type {
  Response,
  NextFunction,
} from "express";

import type { AuthRequest } from "../middleware/auth";
import { UsuarioService } from "../services/UsuarioService";

const usuarioService = new UsuarioService();

function obterId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

function tratarErro(
  error: unknown,
  res: Response
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const mensagens = [
    "Usuário não encontrado.",
    "Nome do usuário é obrigatório.",
    "E-mail do usuário é obrigatório.",
    "A senha deve possuir pelo menos 8 caracteres.",
    "Perfil de usuário inválido.",
    "Já existe um usuário com este e-mail.",
    "Secretaria não encontrada ou inativa.",
    "Você não pode alterar seu próprio perfil.",
    "Você não pode desativar sua própria conta.",
    "Não é possível remover ou desativar o último administrador ativo.",
    "Informe um status válido.",
  ];

  if (mensagens.includes(error.message)) {
    return res.status(
      error.message === "Usuário não encontrado." ? 404 : 400
    ).json({
      success: false,
      message: error.message,
    });
  }

  return null;
}

export class UsuarioController {
  async listar(
    _req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const usuarios = await usuarioService.listar();

      return res.status(200).json({
        success: true,
        data: usuarios,
      });
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = obterId(req.params.id);

      const usuario = await usuarioService.buscarPorId(id);

      return res.status(200).json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      const resposta = tratarErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }

  async criar(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const usuario = await usuarioService.criar(req.body);

      return res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso.",
        data: usuario,
      });
    } catch (error) {
      const resposta = tratarErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }

  async atualizar(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado.",
        });
      }

      const id = obterId(req.params.id);

      const usuario = await usuarioService.atualizar(
        id,
        req.body,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso.",
        data: usuario,
      });
    } catch (error) {
      const resposta = tratarErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }

  async atualizarStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuário não autenticado.",
        });
      }

      const id = obterId(req.params.id);

      const usuario = await usuarioService.atualizarStatus(
        id,
        req.body.ativo,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: "Status do usuário atualizado com sucesso.",
        data: usuario,
      });
    } catch (error) {
      const resposta = tratarErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }
}
