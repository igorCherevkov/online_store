export interface ProviderRequest {
  request_id: string;
  sku: string;
  order_id: string;
}

export type ProviderResponse =
  | { status: 'ok'; request_id: string; code: string }
  | { status: 'error'; message: string; reason?: 'out_of_stock' };

export interface DeliveryProvider {
  readonly name: string;
  request(req: ProviderRequest): Promise<ProviderResponse>;
}
