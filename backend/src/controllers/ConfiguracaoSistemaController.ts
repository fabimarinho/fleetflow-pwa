import type { Request, Response, NextFunction } from "express";
import { ConfiguracaoSistemaService } from "../services/ConfiguracaoSistemaService";

export class ConfiguracaoSistemaController {
  private service = new ConfiguracaoSistemaService();

  async buscar(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const configuracao = await this.service.buscar();

      res.json({
        success: true,
        data: {
          nomeSistema: configuracao.nomeSistema,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async atualizar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { nomeSistema } = req.body;

      if (typeof nomeSistema !== "string" || !nomeSistema.trim()) {
        res.status(400).json({
          success: false,
          message: "Informe o nome do sistema.",
        });
        return;
      }

      if (nomeSistema.trim().length > 100) {
        res.status(400).json({
          success: false,
          message: "O nome do sistema deve ter no máximo 100 caracteres.",
        });
        return;
      }

      const configuracao = await this.service.atualizar(
        nomeSistema.trim()
      );

      res.json({
        success: true,
        message: "Nome do sistema atualizado com sucesso.",
        data: {
          nomeSistema: configuracao.nomeSistema,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
