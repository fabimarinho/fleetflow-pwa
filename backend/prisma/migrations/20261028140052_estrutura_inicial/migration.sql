-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'GESTOR', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('DISPONIVEL', 'EM_USO', 'EM_MANUTENCAO');

-- CreateEnum
CREATE TYPE "StatusViagem" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCombustivel" AS ENUM ('GASOLINA', 'ETANOL', 'DIESEL', 'DIESEL_S10', 'GNV', 'FLEX');

-- CreateEnum
CREATE TYPE "TipoManutencao" AS ENUM ('PREVENTIVA', 'CORRETIVA');

-- CreateEnum
CREATE TYPE "StatusManutencao" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "matricula" TEXT,
    "telefone" TEXT,
    "perfil" "Perfil" NOT NULL DEFAULT 'MOTORISTA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "secretariaId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secretarias" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT,
    "ano" INTEGER,
    "tipo" TEXT,
    "cor" TEXT,
    "kmAtual" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusVeiculo" NOT NULL DEFAULT 'DISPONIVEL',
    "secretariaId" UUID,
    "observacoes" TEXT,
    "proximoOleoKm" INTEGER,
    "licenciamentoAte" DATE,
    "ipvaAte" DATE,
    "seguroAte" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens" (
    "id" UUID NOT NULL,
    "numero" BIGSERIAL NOT NULL,
    "veiculoId" UUID NOT NULL,
    "motoristaId" UUID NOT NULL,
    "secretariaId" UUID,
    "servidorNome" TEXT,
    "servidorMatricula" TEXT,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "objetivo" TEXT,
    "kmSaida" INTEGER NOT NULL,
    "kmRetorno" INTEGER,
    "horaSaida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaChegada" TIMESTAMP(3),
    "fotoHodometroSaidaUrl" TEXT,
    "fotoHodometroRetornoUrl" TEXT,
    "assinaturaUrl" TEXT,
    "assinaturaRetornoUrl" TEXT,
    "checklistSaida" JSONB,
    "checklistRetorno" JSONB,
    "combustivel" TEXT,
    "ocorrencias" TEXT,
    "status" "StatusViagem" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" UUID NOT NULL,
    "veiculoId" UUID NOT NULL,
    "motoristaId" UUID,
    "secretariaId" UUID,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "km" INTEGER NOT NULL,
    "tipoCombustivel" "TipoCombustivel" NOT NULL,
    "litros" DECIMAL(10,3) NOT NULL,
    "valorLitro" DECIMAL(10,3) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "posto" TEXT,
    "observacoes" TEXT,
    "cupomUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" UUID NOT NULL,
    "veiculoId" UUID NOT NULL,
    "tipo" "TipoManutencao" NOT NULL,
    "status" "StatusManutencao" NOT NULL DEFAULT 'ABERTA',
    "descricao" TEXT NOT NULL,
    "oficina" TEXT,
    "km" INTEGER,
    "custo" DECIMAL(12,2),
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),
    "responsavelId" UUID,
    "anexoUrl" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_secretariaId_idx" ON "users"("secretariaId");

-- CreateIndex
CREATE UNIQUE INDEX "secretarias_nome_key" ON "secretarias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_secretariaId_idx" ON "veiculos"("secretariaId");

-- CreateIndex
CREATE INDEX "veiculos_status_idx" ON "veiculos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_numero_key" ON "viagens"("numero");

-- CreateIndex
CREATE INDEX "viagens_veiculoId_idx" ON "viagens"("veiculoId");

-- CreateIndex
CREATE INDEX "viagens_motoristaId_idx" ON "viagens"("motoristaId");

-- CreateIndex
CREATE INDEX "viagens_secretariaId_idx" ON "viagens"("secretariaId");

-- CreateIndex
CREATE INDEX "viagens_status_idx" ON "viagens"("status");

-- CreateIndex
CREATE INDEX "viagens_horaSaida_idx" ON "viagens"("horaSaida");

-- CreateIndex
CREATE INDEX "abastecimentos_veiculoId_idx" ON "abastecimentos"("veiculoId");

-- CreateIndex
CREATE INDEX "abastecimentos_motoristaId_idx" ON "abastecimentos"("motoristaId");

-- CreateIndex
CREATE INDEX "abastecimentos_secretariaId_idx" ON "abastecimentos"("secretariaId");

-- CreateIndex
CREATE INDEX "abastecimentos_data_idx" ON "abastecimentos"("data");

-- CreateIndex
CREATE INDEX "manutencoes_veiculoId_idx" ON "manutencoes"("veiculoId");

-- CreateIndex
CREATE INDEX "manutencoes_responsavelId_idx" ON "manutencoes"("responsavelId");

-- CreateIndex
CREATE INDEX "manutencoes_status_idx" ON "manutencoes"("status");

-- CreateIndex
CREATE INDEX "manutencoes_dataAbertura_idx" ON "manutencoes"("dataAbertura");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
