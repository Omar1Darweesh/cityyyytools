import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Post('sales')
  createSale(@Body() createSaleDto: CreateSaleDto, @Request() req: any) {
    return this.salesService.createSale(createSaleDto, req.user.userId);
  }

  @Get('sales')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateFilter') dateFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      branchId: branchId ? parseInt(branchId) : undefined,
      customerId: customerId ? parseInt(customerId) : undefined,
      search,
      paymentMethod,          // NEW
      dateFilter,             // NEW
      startDate,              // NEW
      endDate,                // NEW
    });
  }

  @Get('sales/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get('daily-summary')
  getDailySummary(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return this.salesService.getDailySummary(branchId, targetDate);
  }
}
