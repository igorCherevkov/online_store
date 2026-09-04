import { Controller, Get } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconcilationService: ReconciliationService) {}

  @Get('paid-not-delivered')
  getPaidNotDelivered() {
    return this.reconcilationService.findPaidNotDelivired();
  }

  @Get('delivered-not-paid')
  getDeliveredNotPaid() {
    return this.reconcilationService.findDeliveredNotPaid();
  }
}
