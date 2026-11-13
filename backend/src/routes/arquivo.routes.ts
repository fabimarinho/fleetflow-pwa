import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

import { auth } from "../middleware/auth";

const router = Router();

const uploadDir = path.resolve(
  __dirname,
  "../../uploads/frota"
);

fs.mkdirSync(uploadDir, {
  recursive: true,
  mode: 0o700,
});

try {
  fs.chmodSync(uploadDir, 0o700);
} catch {
  // Mantém o funcionamento caso o sistema não permita alterar permissões.
}

const extensoesPermitidas: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },

  filename: (_req, file, callback) => {
    const extensao = extensoesPermitidas[file.mimetype];

    if (!extensao) {
      callback(new Error("Formato de imagem não permitido."), "");
      return;
    }

    callback(null, `${randomUUID()}${extensao}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!extensoesPermitidas[file.mimetype]) {
      callback(
        new Error("Formato não permitido. Utilize JPG, PNG ou WEBP.")
      );
      return;
    }

    callback(null, true);
  },
});

// Recebe uma foto ou assinatura.
router.post("/", auth, (req, res) => {
  upload.single("arquivo")(req, res, (error) => {
    if (error) {
      const mensagem =
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
          ? "Arquivo muito grande. O limite é 10 MB."
          : error.message || "Não foi possível receber o arquivo.";

      return res.status(400).json({
        success: false,
        message: mensagem,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nenhum arquivo foi enviado.",
      });
    }

    try {
      fs.chmodSync(req.file.path, 0o600);
    } catch {
      fs.unlink(req.file.path, () => {});

      return res.status(500).json({
        success: false,
        message: "Não foi possível proteger o arquivo enviado.",
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        path: `/api/arquivos/${req.file.filename}`,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  });
});

// Entrega arquivos somente a usuários autenticados.
router.get("/:filename", auth, (req, res) => {
  const filename = String(req.params.filename);

  const nomeValido =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

  if (!nomeValido.test(filename)) {
    return res.status(400).json({
      success: false,
      message: "Nome de arquivo inválido.",
    });
  }

  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "Arquivo não encontrado.",
    });
  }

  res.setHeader("Cache-Control", "private, no-store");

  return res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({
        success: false,
        message: "Não foi possível acessar o arquivo.",
      });
    }
  });
});

export default router;
