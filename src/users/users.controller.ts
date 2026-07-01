import { Body, Controller, Get, Ip, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Step 2 of the apply funnel. IP is captured here for the TCPA record.
  @Post()
  async create(@Body() dto: CreateUserDto, @Ip() ip: string) {
    const user = await this.usersService.create(dto, ip);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      // Full profile so the apply form can prefill (and lock) personal details
      // when a returning user starts another application. SSN is never returned
      // in plaintext — the returning-user flow doesn't require it.
      dob: user.dob,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      hasSsn: Boolean(user.ssnEncrypted),
      tcpaConsent: user.tcpaConsent,
    };
  }
}
