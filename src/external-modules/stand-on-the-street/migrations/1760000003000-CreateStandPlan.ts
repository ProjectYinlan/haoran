import { MigrationInterface, QueryRunner } from 'typeorm'

export default class CreateStandPlan1760000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stand_plan" (
        "id" bigserial PRIMARY KEY,
        "userId" bigint NOT NULL,
        "groupId" bigint NOT NULL,
        "tier" varchar(16) NOT NULL,
        "dailyUsed" integer NOT NULL DEFAULT 0,
        "weeklyUsed" integer NOT NULL DEFAULT 0,
        "weeklyLimit" integer NOT NULL DEFAULT 0,
        "subscribedAt" bigint NOT NULL,
        "expiresAt" bigint NOT NULL,
        "lastDailyReset" bigint NOT NULL DEFAULT 0,
        "bannedUntil" bigint,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stand_plan_user_group" ON "stand_plan" ("userId", "groupId")`)
    await queryRunner.query(`DELETE FROM "stand_inventory" WHERE "itemId" IN ('plan_pro', 'plan_max')`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stand_plan_user_group"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "stand_plan"`)
  }
}
