CREATE TYPE "FormaPagamentoAbastecimento" AS ENUM (
  'PIX',
  'DINHEIRO',
  'CARTAO_DEBITO',
  'FATURADO_CONVENIO'
);

ALTER TABLE "abastecimentos"
ADD COLUMN "formaPagamento" "FormaPagamentoAbastecimento",
ADD COLUMN "empresaConvenio" TEXT;
