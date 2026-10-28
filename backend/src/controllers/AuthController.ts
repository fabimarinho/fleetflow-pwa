import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthService } from "../services/AuthService";
import type { AuthRequest } from "../middleware/auth";

const authService = new AuthService();

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
}
