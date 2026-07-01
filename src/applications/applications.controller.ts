import { Body, Controller, Get, Ip, Param, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { STATUS_TO_STAGE } from '../common/lifecycle';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async create(@Body() dto: CreateApplicationDto) {
    const app = await this.applicationsService.create(dto);
    return this.toStatusView(app);
  }

  @Post('/loan-applications')
  async createLoanApplications(
    @Body() body: CreateLoanApplicationDto,
    @Ip() ip: string,
  ) {
    const app = await this.applicationsService.createLoanApplications(
      body.user,
      body.application,
      body.bank,
      ip,
    );
    return this.toStatusView(app);
  }

  // Drives the customer dashboard list: every application belonging to a user,
  // most recent first. We only have the user id (from the JWT/session) here.
  @Get('user/applications/:userId')
  async findAllApplicationByUser(@Param('userId') userId: string) {
    const apps =
      await this.applicationsService.findAllApplicationByUser(userId);
    return apps.map((app) => ({
      ...this.toStatusView(app),
      loanPurpose: app.loanPurpose,
      createdAt: app.createdAt,
    }));
  }

  // Drives the customer dashboard after OTP login, where we only have the user
  // id (from the JWT/session) rather than a specific application id.
  @Get('user/:userId')
  async findLatestByUser(@Param('userId') userId: string) {
    const app = await this.applicationsService.findLatestByUserId(userId);
    return this.toStatusView(app);
  }

  // Drives the customer dashboard lifecycle tracker.
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const app = await this.applicationsService.findById(id);
    return this.toStatusView(app);
  }

  @Post(':id/esign')
  async esign(@Param('id') id: string, @Ip() ip: string) {
    const app = await this.applicationsService.esign(id, ip);
    return this.toStatusView(app);
  }

  private toStatusView(app: {
    id: string;
    status: string;
    requestedAmount: number;
    loanTermMonths: number;
    monthlyPayment: number;
    calculatedDti: number;
    statusReason?: string;
  }) {
    const stage = STATUS_TO_STAGE[app.status] ?? {
      index: -1,
      label: app.status,
    };
    return {
      id: app.id,
      status: app.status,
      statusReason: app.statusReason ?? null,
      stageIndex: stage.index,
      stageLabel: stage.label,
      requestedAmount: Number(app.requestedAmount),
      loanTermMonths: app.loanTermMonths,
      monthlyPayment: Number(app.monthlyPayment),
      calculatedDti: Number(app.calculatedDti),
    };
  }
}
