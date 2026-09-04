import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentService } from './payments.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

@Controller('webhook')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('payment')
  @HttpCode(200)
  handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.payments.handleWebhook(dto);
  }
}
