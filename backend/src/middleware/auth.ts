import type {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: string;
  perfil: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: "Token não informado.",
    });
    return;
  }

  const [tipo, token] = authHeader.split(" ");

  if (tipo !== "Bearer" || !token) {
    res.status(401).json({
      success: false,
      message: "Token inválido.",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET não configurado.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      jwtSecret
    ) as TokenPayload;

    req.user = {
      id: decoded.id,
      perfil: decoded.perfil,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token inválido ou expirado.",
    });
  }
}
