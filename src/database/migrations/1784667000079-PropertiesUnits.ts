import { MigrationInterface, QueryRunner } from "typeorm";

export class PropertiesUnits1784667000079 implements MigrationInterface {
    name = 'PropertiesUnits1784667000079'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."properties_type_enum" AS ENUM('residential', 'commercial', 'mixed')`);
        await queryRunner.query(`CREATE TYPE "public"."properties_status_enum" AS ENUM('active', 'archived')`);
        await queryRunner.query(`CREATE TABLE "properties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "address" text NOT NULL, "city" character varying(100), "zipCode" character varying(20), "type" "public"."properties_type_enum" NOT NULL DEFAULT 'residential', "status" "public"."properties_status_enum" NOT NULL DEFAULT 'active', "unitCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_220d2c2f64cf6d6eeb6816b84a" ON "properties" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."units_type_enum" AS ENUM('studio', '1br', '2br', '3br', 'office', 'commercial')`);
        await queryRunner.query(`CREATE TYPE "public"."units_status_enum" AS ENUM('vacant', 'occupied', 'maintenance', 'archived')`);
        await queryRunner.query(`CREATE TABLE "units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(32) NOT NULL, "propertyId" uuid NOT NULL, "unitNumber" character varying(100) NOT NULL, "description" text, "type" "public"."units_type_enum" NOT NULL, "status" "public"."units_status_enum" NOT NULL DEFAULT 'vacant', "monthlyRent" numeric(10,2), "deposit" numeric(10,2), "floorNumber" integer, "hasBalcony" boolean NOT NULL DEFAULT false, "hasParkingSpace" boolean NOT NULL DEFAULT false, "amenities" text, CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_47635c1ab22d02fc3ebae3608b" ON "units" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_546f4aa111022d983a32103048" ON "units" ("propertyId") `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_546f4aa111022d983a32103048b" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_546f4aa111022d983a32103048b"`);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "perms" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_546f4aa111022d983a32103048"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47635c1ab22d02fc3ebae3608b"`);
        await queryRunner.query(`DROP TABLE "units"`);
        await queryRunner.query(`DROP TYPE "public"."units_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."units_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_220d2c2f64cf6d6eeb6816b84a"`);
        await queryRunner.query(`DROP TABLE "properties"`);
        await queryRunner.query(`DROP TYPE "public"."properties_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."properties_type_enum"`);
    }

}
