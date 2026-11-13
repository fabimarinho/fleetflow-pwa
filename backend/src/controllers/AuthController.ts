import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthService } from "../services/AuthService";
import type { AuthRequest } from "../middleware/auth";

const authService = new AuthService();

function responderErro(
  error: unknown,
  res: Response
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const mensagens = [
    "Usuário não encontrado.",
    "Usuário inativo.",
    "Informe um nome válido.",
    "O nome deve ter entre 2 e 100 caracteres.",
    "Informe um telefone válido.",
    "O telefone deve ter no máximo 20 caracteres.",
    "Informe uma matrícula válida.",
    "A matrícula deve ter no máximo 30 caracteres.",
    "Nenhum dado foi informado para atualização.",
    "Informe sua senha atual.",
    "A nova senha deve ter entre 8 e 72 caracteres.",
    "A senha atual está incorreta.",
  ];

  if (mensagens.includes(error.message)) {
    const status =
      error.message === "Usuário não encontrado." ||
      error.message === "Usuário inativo."
        ? 401
        : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }

  return null;
}

export class AuthController {
  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, senha } = req.body;

      const resultado = await authService.login(
        email,
        senha
      );

      return res.status(200).json({
        success: true,
        message: "Login realizado com sucesso.",
        data: resultado,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message === "E-mail ou senha inválidos." ||
          error.message === "E-mail e senha são obrigatórios." ||
          error.message === "Usuário inativo."
        )
      ) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  }

  async me(
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

      const usuario = await authService.me(
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: "Usuário autenticado.",
        data: usuario,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message === "Usuário não encontrado." ||
          error.message === "Usuário inativo."
        )
      ) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  }

  async atualizarMeuPerfil(
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

      const usuario = await authService.atualizarMeuPerfil(
        req.user.id,
        req.body ?? {}
      );

      return res.status(200).json({
        success: true,
        message: "Perfil atualizado com sucesso.",
        data: usuario,
      });
    } catch (error) {
      const resposta = responderErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }

  async alterarMinhaSenha(
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

      await authService.alterarMinhaSenha(
        req.user.id,
        req.body?.senhaAtual,
        req.body?.novaSenha
      );

      return res.status(200).json({
        success: true,
        message: "Senha alterada com sucesso.",
      });
    } catch (error) {
      const resposta = responderErro(error, res);

      if (resposta) return resposta;

      next(error);
    }
  }
}
