import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrackingService } from './tracking.service';

@Module({
  imports: [HttpModule],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
