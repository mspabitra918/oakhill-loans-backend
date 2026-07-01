import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildSequelizeOptions } from '../../config/database.config';

// Wires Sequelize into Nest using the shared connection builder. Models are
// registered per-feature via SequelizeModule.forFeature and picked up by
// autoLoadModels.
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildSequelizeOptions(config),
    }),
  ],
})
export class DatabaseModule {}
