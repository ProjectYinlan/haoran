import { MigrationInterface, QueryRunner } from 'typeorm'

export default class CreateStandInventory1760000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stand_inventory" (
        "id" bigserial PRIMARY KEY,
        "userId" bigint NOT NULL,
        "groupId" bigint NOT NULL,
        "itemId" varchar NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_stand_inventory_user_group_item" ON "stand_inventory" ("userId", "groupId", "itemId")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_stand_inventory_user_group_item"`)
    await queryRunner.query(`DROP TABLE "stand_inventory"`)
  }
}
