import { MigrationInterface, QueryRunner } from "typeorm";

export class LeasesInvoices1784674727602 implements MigrationInterface {
    name = 'LeasesInvoices1784674727602'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."leases_status_enum" AS ENUM('active', 'ending', 'ended')`);
        await queryRunner.query(`CREATE TABLE "leases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "tenantId" uuid NOT NULL, "unitId" uuid NOT NULL, "propertyId" uuid NOT NULL, "start" date NOT NULL, "end" date NOT NULL, "rent" numeric(12,2) NOT NULL, "deposit" numeric(12,2) NOT NULL, "frequency" character varying(50) NOT NULL, "status" "public"."leases_status_enum" NOT NULL DEFAULT 'active', "billing" text, "grace" text, "penalty" text, "renewal" text, "notes" text, CONSTRAINT "PK_2668e338ab2d27079170ea55ea2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2ac8981e5363814be2d47c7570" ON "leases" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_175030e58c0d1accdb888a431d" ON "leases" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_41ddb25063485103a828efc408" ON "leases" ("unitId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f7abdef0af12d69bdcb85f8949" ON "leases" ("propertyId") `);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('due', 'partial', 'paid')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "tenantId" uuid NOT NULL, "leaseId" uuid NOT NULL, "propertyId" uuid NOT NULL, "issued" date NOT NULL, "due" date NOT NULL, "amount" numeric(12,2) NOT NULL, "balance" numeric(12,2) NOT NULL, "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'due', "items" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e38e380c25aacf8cd59d6ae21f" ON "invoices" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_89c82485e364081f457b210120" ON "invoices" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d918bd7dff03a43f8e0dc8ed93" ON "invoices" ("leaseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7d55de85575f6e5b205fd6ae4b" ON "invoices" ("propertyId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "leases" ADD CONSTRAINT "FK_175030e58c0d1accdb888a431d8" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leases" ADD CONSTRAINT "FK_41ddb25063485103a828efc4084" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leases" ADD CONSTRAINT "FK_f7abdef0af12d69bdcb85f89493" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_89c82485e364081f457b210120d" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_d918bd7dff03a43f8e0dc8ed939" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_7d55de85575f6e5b205fd6ae4b0" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_7d55de85575f6e5b205fd6ae4b0"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_d918bd7dff03a43f8e0dc8ed939"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_89c82485e364081f457b210120d"`);
        await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT "FK_f7abdef0af12d69bdcb85f89493"`);
        await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT "FK_41ddb25063485103a828efc4084"`);
        await queryRunner.query(`ALTER TABLE "leases" DROP CONSTRAINT "FK_175030e58c0d1accdb888a431d8"`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d55de85575f6e5b205fd6ae4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d918bd7dff03a43f8e0dc8ed93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89c82485e364081f457b210120"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e38e380c25aacf8cd59d6ae21f"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7abdef0af12d69bdcb85f8949"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_41ddb25063485103a828efc408"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_175030e58c0d1accdb888a431d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ac8981e5363814be2d47c7570"`);
        await queryRunner.query(`DROP TABLE "leases"`);
        await queryRunner.query(`DROP TYPE "public"."leases_status_enum"`);
    }

}
