import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnderwritingService } from './underwriting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/constants';
import {
  AdvanceDto,
  DeclineDto,
  ReleaseFundsDto,
} from './dto/underwriting.dto';

// Entire portal requires an authenticated admin/underwriter.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.UNDERWRITER)
@Controller('underwriting')
export class UnderwritingController {
  constructor(private readonly underwriting: UnderwritingService) {}

  @Get('queues')
  queues() {
    return this.underwriting.getQueues();
  }

  // Flat, searchable application list for the admin table. Declared before the
  // `:id` route so "search" isn't captured as an application id.
  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.underwriting.searchApplications({ q, status, date });
  }

  @Get(':id')
  dualView(@Param('id') id: string) {
    return this.underwriting.getDualView(id);
  }

  @Post(':id/advance')
  advance(
    @Param('id') id: string,
    @Body() dto: AdvanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.underwriting.advance(id, dto.status, user.email, dto.reason);
  }

  @Post(':id/decline')
  decline(
    @Param('id') id: string,
    @Body() dto: DeclineDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.underwriting.decline(id, dto.reason, user.email);
  }

  @Post(':id/reminder')
  reminder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.underwriting.sendReminder(id, user.email);
  }

  // Human-in-the-loop ACH release — the only disbursement path.
  @Post(':id/release-funds')
  releaseFunds(
    @Param('id') id: string,
    @Body() dto: ReleaseFundsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.underwriting.releaseFunds(id, dto, user.email);
  }
}
