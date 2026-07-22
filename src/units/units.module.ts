import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesModule } from '../properties/properties.module';
import { Unit } from './entities/unit.entity';
import { UnitsController } from './units.controller';
import { UnitsFlatController } from './units-flat.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unit]), PropertiesModule],
  controllers: [UnitsController, UnitsFlatController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
