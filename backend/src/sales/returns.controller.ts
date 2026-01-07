import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReturnDto } from './dto/returns.dto';

@Controller('pos/returns')  // ✅ Changed from 'sales/returns' to 'pos/returns'
@UseGuards(JwtAuthGuard)
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) { }

    @Post()
    createReturn(@Body() createReturnDto: CreateReturnDto, @Request() req: any) {
        return this.returnsService.createReturn({
            ...createReturnDto,
            userId: req.user.userId,
        });
    }

    @Get()
    findAll(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('branchId') branchId?: string,
        @Query('salesInvoiceId') salesInvoiceId?: string, // ✅ Add this

    ) {
        return this.returnsService.findAll({
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
            branchId: branchId ? parseInt(branchId) : undefined,
            salesInvoiceId: salesInvoiceId ? parseInt(salesInvoiceId) : undefined, // ✅ Add this

        });
    }
}
