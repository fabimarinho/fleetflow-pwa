-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nomeSistema" TEXT NOT NULL DEFAULT 'Gestão de Frota',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("id")
);
