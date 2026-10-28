import "dotenv/config";

import app from "./app";
import prisma from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await prisma.$connect();

    console.log("Banco de dados conectado.");
    console.log(`Controle de Frota API iniciada na porta ${PORT}`);

    app.listen(PORT, () => {
      console.log(`Servidor ouvindo em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error);
    process.exit(1);
  }
}

start();
