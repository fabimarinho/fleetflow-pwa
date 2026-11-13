-- CreateEnum
CREATE TYPE "StatusAgendamentoManutencao" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "agendamentos_manutencao" (
    "id" UUID NOT NULL,
    "veiculoId" UUID NOT NULL,
    "tipo" "TipoManutencao" NOT NULL,
    "status" "StatusAgendamentoManutencao" NOT NULL DEFAULT 'AGENDADA',
    "descricao" TEXT NOT NULL,
    "oficina" TEXT,
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "kmPrevisto" INTEGER,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "agendamentos_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agendamentos_manutencao_veiculoId_idx" ON "agendamentos_manutencao"("veiculoId");

-- CreateIndex
CREATE INDEX "agendamentos_manutencao_status_idx" ON "agendamentos_manutencao"("status");

-- CreateIndex
CREATE INDEX "agendamentos_manutencao_dataAgendada_idx" ON "agendamentos_manutencao"("dataAgendada");

-- AddForeignKey
ALTER TABLE "agendamentos_manutencao" ADD CONSTRAINT "agendamentos_manutencao_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_manutencao" ADD CONSTRAINT "agendamentos_manutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
