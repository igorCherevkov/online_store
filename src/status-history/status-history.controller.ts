import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { StatusHistoryService } from './status-history.service';

@Controller('status-history')
export class StatusHistoryController {
  constructor(private readonly statusHistoryService: StatusHistoryService) {}

  @Get('orders/:id')
  async getOrderAsOf(@Param('id') id: string, @Query('asOf') asOf: string) {
    if (!asOf) {
      throw new BadRequestException(`Query param "asOf" is require`);
    }

    const date = new Date(asOf);

    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid "asOf" date');
    }

    return this.statusHistoryService.getOrderStateAsOf(id, date);
  }

  @Get('total')
  async getPeriodTotals(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException(
        `Query params "from" and "to " are required`,
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(`Invalid date format`);
    }

    return this.statusHistoryService.getPeriodTotals(fromDate, toDate);
  }
}
