import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceUpdateDto {
    @IsNumber()
    productId: number;

    @IsOptional()
    @IsNumber()
    priceRetail?: number;

    @IsOptional()
    @IsNumber()
    priceWholesale?: number;
}

export class BulkPriceUpdateDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PriceUpdateDto)
    updates: PriceUpdateDto[];

    @IsOptional()
    @IsString()
    reason?: string;
}

export class CategoryPriceUpdateDto {
    @IsNumber()
    categoryId: number;

    @IsNumber()
    adjustment: number;

    @IsEnum(['PERCENTAGE', 'FIXED'])
    adjustmentType: 'PERCENTAGE' | 'FIXED';

    @IsEnum(['RETAIL', 'WHOLESALE'])
    priceType: 'RETAIL' | 'WHOLESALE';

    @IsOptional()
    @IsString()
    reason?: string;
}
