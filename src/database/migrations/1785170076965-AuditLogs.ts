import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditLogs1785170076965 implements MigrationInterface {
    name = 'AuditLogs1785170076965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Backs AuditService.nextCode() — a real sequence rather than the
        // MAX(code)+1-under-a-table-lock pattern every other module uses,
        // since this table is written on nearly every request and a per-write
        // lock would serialize all API traffic through it.
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "audit_log_code_seq" START 1`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_outcome_enum" AS ENUM('success', 'denied', 'error')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "actorUserId" uuid, "actorName" character varying(160) NOT NULL DEFAULT 'System', "actorEmail" character varying(255), "resource" character varying(40) NOT NULL, "action" character varying(40) NOT NULL, "resourceId" character varying(32), "resourceName" character varying(255), "description" text NOT NULL, "method" character varying(10) NOT NULL, "path" character varying(255) NOT NULL, "statusCode" integer, "outcome" "public"."audit_logs_outcome_enum" NOT NULL DEFAULT 'success', "ipAddress" character varying(64), "userAgent" character varying(255), "icon" character varying(40) NOT NULL DEFAULT 'history', "metadata" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c38c25cc6df07eed305de87daa" ON "audit_logs" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_e36d23e1e7cf81ea77758bef79" ON "audit_logs" ("actorUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8769d5d852a6b56dd77186a1c6" ON "audit_logs" ("resource") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_b41c13e0a4212c95088d102981" ON "audit_logs" ("resourceId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b41c13e0a4212c95088d102981"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8769d5d852a6b56dd77186a1c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e36d23e1e7cf81ea77758bef79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c38c25cc6df07eed305de87daa"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_outcome_enum"`);
        await queryRunner.query(`DROP SEQUENCE IF EXISTS "audit_log_code_seq"`);
    }

}
