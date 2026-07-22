import { MigrationInterface, QueryRunner } from "typeorm";

export class PropertiesUnitsTenants1784673759597 implements MigrationInterface {
    name = 'PropertiesUnitsTenants1784673759597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."properties_type_enum" AS ENUM('apartment', 'office', 'hostel', 'house', 'commercial')`);
        await queryRunner.query(`CREATE TYPE "public"."properties_status_enum" AS ENUM('active', 'archived')`);
        await queryRunner.query(`CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."properties_type_enum" NOT NULL, "area" character varying(100) NOT NULL, "city" character varying(100) NOT NULL, "owner" character varying(255) NOT NULL, "status" "public"."properties_status_enum" NOT NULL DEFAULT 'active', "description" text, "amenities" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_220d2c2f64cf6d6eeb6816b84a" ON "properties" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'prospective', 'notice', 'vacated', 'blacklisted')`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "name" character varying(160) NOT NULL, "phone" character varying(32) NOT NULL, "email" character varying(255) NOT NULL, "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'prospective', "since" date NOT NULL, "unitId" uuid, "propertyId" uuid, "org" character varying(255) NOT NULL DEFAULT '', "occupation" character varying(160) NOT NULL, "employer" character varying(160) NOT NULL DEFAULT '', "idType" character varying(50) NOT NULL, "idNumber" character varying(100) NOT NULL, "kin" text NOT NULL DEFAULT '—', "comms" character varying(20) NOT NULL DEFAULT 'SMS', CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3021c18db2b363ae9324c826c5" ON "tenants" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_05950ee1c47747d7e054d87c74" ON "tenants" ("unitId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40b6986ec14295696de254b13d" ON "tenants" ("propertyId") `);
        await queryRunner.query(`CREATE TYPE "public"."units_status_enum" AS ENUM('vacant', 'occupied')`);
        await queryRunner.query(`CREATE TABLE "units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "propertyId" uuid NOT NULL, "no" character varying(100) NOT NULL, "floor" integer NOT NULL, "type" character varying(50) NOT NULL, "size" numeric(10,2) NOT NULL, "rent" numeric(12,2) NOT NULL, "deposit" numeric(12,2) NOT NULL, "status" "public"."units_status_enum" NOT NULL DEFAULT 'vacant', "tenantId" uuid, "beds" integer, "bathrooms" integer, "block" character varying(50), "minTenure" integer, "amenities" jsonb NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "UQ_4756c9795811d06406ef53eeeec" UNIQUE ("propertyId", "no"), CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_47635c1ab22d02fc3ebae3608b" ON "units" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_546f4aa111022d983a32103048" ON "units" ("propertyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb4d16ad5d8d72b4af76338ae7" ON "units" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "FK_05950ee1c47747d7e054d87c747" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "FK_40b6986ec14295696de254b13d9" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_546f4aa111022d983a32103048b" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_cb4d16ad5d8d72b4af76338ae79" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_cb4d16ad5d8d72b4af76338ae79"`);
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_546f4aa111022d983a32103048b"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_40b6986ec14295696de254b13d9"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_05950ee1c47747d7e054d87c747"`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cb4d16ad5d8d72b4af76338ae7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_546f4aa111022d983a32103048"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47635c1ab22d02fc3ebae3608b"`);
        await queryRunner.query(`DROP TABLE "units"`);
        await queryRunner.query(`DROP TYPE "public"."units_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40b6986ec14295696de254b13d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05950ee1c47747d7e054d87c74"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3021c18db2b363ae9324c826c5"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_220d2c2f64cf6d6eeb6816b84a"`);
        await queryRunner.query(`DROP TABLE "properties"`);
        await queryRunner.query(`DROP TYPE "public"."properties_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."properties_type_enum"`);
    }

}
