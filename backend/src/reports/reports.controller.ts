import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('sales-summary')
    getSalesSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.reportsService.getSalesSummary({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            branchId: branchId ? parseInt(branchId) : undefined,
        });
    }

    @Get('top-products')
    getTopProducts(
        @Query('limit') limit?: string,
        @Query('branchId') branchId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.getTopProducts({
            limit: limit ? parseInt(limit) : undefined,
            branchId: branchId ? parseInt(branchId) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('low-stock')
    getLowStockProducts(
        @Query('threshold') threshold?: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.reportsService.getLowStockProducts({
            threshold: threshold ? parseInt(threshold) : undefined,
            branchId: branchId ? parseInt(branchId) : undefined,
        });
    }

    @Get('dashboard')
    getDashboardMetrics(
        @Query('branchId') branchId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.getDashboardMetrics({
            branchId: branchId ? parseInt(branchId) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('dashboard-summary')
    getDashboardSummary(@Query('branchId') branchId?: string) {
        return this.reportsService.getDashboardSummary({
            branchId: branchId ? parseInt(branchId) : undefined,
        });
    }
}
