import type {
  Response,
  NextFunction,
} from "express";
import type { Perfil } from "@prisma/client";

import type { AuthRequest } from "./auth";

export function authorize(perfis: Perfil[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
      return;
    }

    if (!perfis.includes(req.user.perfil as Perfil)) {
      res.status(403).json({
        success: false,
        message: "Acesso negado.",
      });
      return;
    }

    next();
  };
}
