import { MigrationInterface, QueryRunner } from 'typeorm'

export default class CreateStandTables1760000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stand_record" (
        "id" bigserial PRIMARY KEY,
        "userId" bigint NOT NULL,
        "groupId" bigint NOT NULL,
        "score" bigint NOT NULL DEFAULT 0,
        "countFriends" integer NOT NULL DEFAULT 0,
        "countOthers" integer NOT NULL DEFAULT 0,
        "into" jsonb NOT NULL DEFAULT '[]',
        "out" jsonb NOT NULL DEFAULT '[]',
        "statsInto" bigint NOT NULL DEFAULT 0,
        "statsOut" bigint NOT NULL DEFAULT 0,
        "nextTime" timestamp,
        "force" boolean NOT NULL DEFAULT false,
        "notify" boolean,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_stand_record_user_group" ON "stand_record" ("userId", "groupId")`)

    await queryRunner.query(`
      CREATE TABLE "stand_merchant_order" (
        "id" bigserial PRIMARY KEY,
        "orderId" uuid NOT NULL,
        "billId" bigint,
        "userId" bigint NOT NULL,
        "groupId" bigint,
        "amount" bigint NOT NULL,
        "sourceType" varchar NOT NULL,
        "targetType" varchar NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_stand_merchant_order_orderId" ON "stand_merchant_order" ("orderId")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_stand_merchant_order_orderId"`)
    await queryRunner.query(`DROP TABLE "stand_merchant_order"`)
    await queryRunner.query(`DROP INDEX "IDX_stand_record_user_group"`)
    await queryRunner.query(`DROP TABLE "stand_record"`)
  }
}

