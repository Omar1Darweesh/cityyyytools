import {
    IsInt,
    IsString,
    IsOptional,
    IsArray,
    ValidateNested,
    IsNumber,
    IsEnum,  // ✅ ADD THIS
} from 'class-validator';
import { Type } from 'class-transformer';

// ✅ ADD THIS ENUM
export enum ReturnType {
    STOCK = 'STOCK',
    DEFECTIVE = 'DEFECTIVE',
}

export class ReturnItemDto {
    @IsInt()
    productId: number;

    @IsInt()
    qtyReturned: number;

    @IsNumber()
    refundAmount: number;

    // ✅ ADD THIS FIELD
    @IsEnum(ReturnType)
    @IsOptional()
    returnType?: ReturnType;
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
