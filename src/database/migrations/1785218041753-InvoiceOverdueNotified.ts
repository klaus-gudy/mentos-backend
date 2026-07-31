import { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceOverdueNotified1785218041753 implements MigrationInterface {
    name = 'InvoiceOverdueNotified1785218041753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "overdueNotifiedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "overdueNotifiedAt"`);
    }

}
