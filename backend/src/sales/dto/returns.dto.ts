import {
    IsInt,
    IsString,
    IsOptional,
    IsArray,
    ValidateNested,
    IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDto {
    @IsInt()
    productId: number;

    @IsInt()
    qtyReturned: number;

    @IsNumber()
    refundAmount: number;
}

export class CreateReturnDto {
    @IsInt()
    salesInvoiceId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnItemDto)
    items: ReturnItemDto[];

    @IsString()
    @IsOptional()
    reason?: string;
}
