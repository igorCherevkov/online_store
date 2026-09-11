import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimiterService {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requestTimestamps: number[] = [];

  constructor(private readonly config: ConfigService) {
    this.maxRequests = Number(this.config.get('PROVIDER_RATE_LIMIT') ?? 20);
    this.windowMs = 60000;
  }

  private cleanOldStamps(now: number): void {
    const cleanInterval = now - this.windowMs;

    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => t > cleanInterval,
    );
  }

  tryTake(): boolean {
    const now = Date.now();

    this.cleanOldStamps(now);

    if (this.requestTimestamps.length < this.maxRequests) {
      this.requestTimestamps.push(now);

      return true;
    }

    return false;
  }

  takeAvailable(): number {
    this.cleanOldStamps(Date.now());

    return this.maxRequests - this.requestTimestamps.length;
  }
}
