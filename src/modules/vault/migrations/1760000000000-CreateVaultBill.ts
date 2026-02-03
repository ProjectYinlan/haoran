import { MigrationInterface, QueryRunner } from 'typeorm'

export default class CreateVaultBill1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vault_bill" (
        "id" bigserial PRIMARY KEY,
        "orderId" uuid NOT NULL,
        "userId" bigint NOT NULL,
        "groupId" bigint,
        "change" bigint NOT NULL,
        "type" varchar NOT NULL,
        "source" varchar NOT NULL,
        "description" varchar NOT NULL,
        "merchantOrderId" uuid,
        "merchantMeta" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_vault_bill_orderId" ON "vault_bill" ("orderId")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_vault_bill_orderId"`)
    await queryRunner.query(`DROP TABLE "vault_bill"`)
  }
}

