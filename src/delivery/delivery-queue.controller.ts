import { Controller, Get } from '@nestjs/common';
import { DeliveryQueueService } from './delivery-queue.service';

@Controller('queue')
export class DeliveryQueueController {
  constructor(private readonly queue: DeliveryQueueService) {}

  @Get('status')
  getStatus() {
    return this.queue.getStatus();
  }
}
