import { MigrationInterface, QueryRunner } from "typeorm";

export class Documents1785159168211 implements MigrationInterface {
    name = 'Documents1785159168211'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."documents_generatedby_enum" AS ENUM('upload', 'system')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(20) NOT NULL, "propertyId" uuid, "unitId" uuid, "tenantId" uuid, "leaseId" uuid, "invoiceId" uuid, "paymentId" uuid, "maintenanceRequestId" uuid, "storageKey" text NOT NULL, "mimeType" character varying(100) NOT NULL, "sizeBytes" integer NOT NULL, "originalFileName" character varying(255), "version" integer NOT NULL DEFAULT '1', "generatedBy" "public"."documents_generatedby_enum" NOT NULL DEFAULT 'upload', "uploadedByUserId" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b5ee64751658da17f074f8884d" ON "documents" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_da53bc3356720fd3f80ce88fcb" ON "documents" ("propertyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c7fd68995f9230d266b0f620ce" ON "documents" ("unitId") `);
        await queryRunner.query(`CREATE INDEX "IDX_60f16e580e8deb01244205a435" ON "documents" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f98542b52f3d8169459523aee0" ON "documents" ("leaseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_998c6b9d2d3f298243299a14d7" ON "documents" ("invoiceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_96844d1167caade20fede33d90" ON "documents" ("paymentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a64a6943c2aaa2100e3db29596" ON "documents" ("maintenanceRequestId") `);
        await queryRunner.query(`CREATE INDEX "IDX_981948381b79206e1a4c59e8f2" ON "documents" ("uploadedByUserId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_da53bc3356720fd3f80ce88fcb0" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_c7fd68995f9230d266b0f620cec" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_60f16e580e8deb01244205a4359" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_f98542b52f3d8169459523aee03" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_998c6b9d2d3f298243299a14d72" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_96844d1167caade20fede33d900" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_a64a6943c2aaa2100e3db295962" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_981948381b79206e1a4c59e8f24" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_981948381b79206e1a4c59e8f24"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_a64a6943c2aaa2100e3db295962"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_96844d1167caade20fede33d900"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_998c6b9d2d3f298243299a14d72"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_f98542b52f3d8169459523aee03"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_60f16e580e8deb01244205a4359"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_c7fd68995f9230d266b0f620cec"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_da53bc3356720fd3f80ce88fcb0"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "items" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "properties" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "amenities" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_981948381b79206e1a4c59e8f2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a64a6943c2aaa2100e3db29596"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96844d1167caade20fede33d90"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_998c6b9d2d3f298243299a14d7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f98542b52f3d8169459523aee0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60f16e580e8deb01244205a435"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7fd68995f9230d266b0f620ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da53bc3356720fd3f80ce88fcb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b5ee64751658da17f074f8884d"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."documents_generatedby_enum"`);
    }

}
