import { IsIn, IsInt, IsISO8601, IsPositive, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  event_id: string;

  @IsString()
  order_id: string;

  @IsIn(['paid', 'failed'])
  status: 'paid' | 'failed';

  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  currency: string;

  @IsISO8601()
  created_at: string;
}
