import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PaginationQueryDto } from '../utils/pagination/types/pagination-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  find(@Query() query: PaginationQueryDto) {
    return this.productsService.find(query.page, query.limit);
  }

  @Get(':sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }
}
