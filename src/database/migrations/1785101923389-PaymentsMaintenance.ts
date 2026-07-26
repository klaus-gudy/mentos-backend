import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentsMaintenance1785101923389 implements MigrationInterface {
    name = 'PaymentsMaintenance1785101923389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."technicians_status_enum" AS ENUM('active', 'on_leave', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "technicians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "name" character varying(160) NOT NULL, "phone" character varying(32) NOT NULL, "email" character varying(255) NOT NULL, "skills" jsonb NOT NULL, "status" "public"."technicians_status_enum" NOT NULL DEFAULT 'active', "company" boolean NOT NULL DEFAULT false, "since" date NOT NULL, CONSTRAINT "PK_b14514b23605f79475be53065b3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_60710b1abe8b0a6d93b5ed8f2b" ON "technicians" ("code") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "invoiceId" uuid NOT NULL, "tenantId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "method" character varying(30) NOT NULL, "date" date NOT NULL, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2b3c754ea3bf83cab000b8ed3d" ON "payments" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_43d19956aeab008b49e0804c14" ON "payments" ("invoiceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_98a04cdcbac4f6a2c55c7d1935" ON "payments" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_requests_priority_enum" AS ENUM('urgent', 'high', 'medium', 'low')`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_requests_status_enum" AS ENUM('open', 'assigned', 'in_progress', 'completed', 'closed')`);
        await queryRunner.query(`CREATE TABLE "maintenance_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "unitId" uuid NOT NULL, "propertyId" uuid NOT NULL, "tenantId" uuid, "category" character varying(20) NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL, "priority" "public"."maintenance_requests_priority_enum" NOT NULL, "status" "public"."maintenance_requests_status_enum" NOT NULL DEFAULT 'open', "assigneeId" uuid, "cost" numeric(12,2) NOT NULL DEFAULT '0', "preferred" character varying(100) NOT NULL DEFAULT 'Any time', CONSTRAINT "PK_c1521eb67c471accae8c531f9fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8f07557e515c16cb135eeccd02" ON "maintenance_requests" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_eb50b765c3312bfb18d99a5eaa" ON "maintenance_requests" ("unitId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0fa682ed08cee03a5381e00b76" ON "maintenance_requests" ("propertyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0aea50a0b5a28267b8e793218f" ON "maintenance_requests" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b593e0e1c5ba398deb2b66a1fe" ON "maintenance_requests" ("assigneeId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum" RENAME TO "invoices_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('due', 'partial', 'paid', 'void')`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum" USING "status"::"text"::"public"."invoices_status_enum"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'due'`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_98a04cdcbac4f6a2c55c7d19350" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_eb50b765c3312bfb18d99a5eaa0" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_0fa682ed08cee03a5381e00b761" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_0aea50a0b5a28267b8e793218f9" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_b593e0e1c5ba398deb2b66a1fe0" FOREIGN KEY ("assigneeId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_b593e0e1c5ba398deb2b66a1fe0"`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_0aea50a0b5a28267b8e793218f9"`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_0fa682ed08cee03a5381e00b761"`);
        await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT "FK_eb50b765c3312bfb18d99a5eaa0"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_98a04cdcbac4f6a2c55c7d19350"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum_old" AS ENUM('due', 'partial', 'paid')`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum_old" USING "status"::"text"::"public"."invoices_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'due'`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum_old" RENAME TO "invoices_status_enum"`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b593e0e1c5ba398deb2b66a1fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0aea50a0b5a28267b8e793218f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fa682ed08cee03a5381e00b76"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb50b765c3312bfb18d99a5eaa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f07557e515c16cb135eeccd02"`);
        await queryRunner.query(`DROP TABLE "maintenance_requests"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_requests_priority_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98a04cdcbac4f6a2c55c7d1935"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43d19956aeab008b49e0804c14"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b3c754ea3bf83cab000b8ed3d"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60710b1abe8b0a6d93b5ed8f2b"`);
        await queryRunner.query(`DROP TABLE "technicians"`);
        await queryRunner.query(`DROP TYPE "public"."technicians_status_enum"`);
    }

}
