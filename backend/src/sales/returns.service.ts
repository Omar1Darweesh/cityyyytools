import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReturnDto } from './dto/returns.dto';
import { ProductAuditService } from '../products/product-audit.service';

@Injectable()
export class ReturnsService {
    constructor(
        private prisma: PrismaService,
        private productAuditService: ProductAuditService,
    ) { }

    async createReturn(data: CreateReturnDto & { userId: number }) {
        const { salesInvoiceId, items, reason, userId } = data;

        // Verify sales invoice exists
        const salesInvoice = await this.prisma.salesInvoice.findUnique({
            where: { id: salesInvoiceId },
            include: {
                lines: {
                    include: {
                        product: true,
                    },
                },
                branch: true,
            },
        });

        if (!salesInvoice) {
            throw new NotFoundException(`Sales invoice with ID ${salesInvoiceId} not found`);
        }

        // ✅ Check for already returned quantities
        const existingReturns = await this.prisma.salesReturn.findMany({
            where: { salesInvoiceId },
            include: { lines: true },
        });

        const returnedQuantities = new Map<number, number>();
        existingReturns.forEach((ret: any) => {
            ret.lines.forEach((line: any) => {
                const current = returnedQuantities.get(line.productId) || 0;
                returnedQuantities.set(line.productId, current + line.qtyReturned);
            });
        });

        // Validate return quantities
        for (const item of items) {
            const salesLine = salesInvoice.lines.find(
                (line) => line.productId === item.productId,
            );

            if (!salesLine) {
                throw new BadRequestException(
                    `Product ${item.productId} not found in sales invoice`,
                );
            }

            const alreadyReturned = returnedQuantities.get(item.productId) || 0;
            const availableToReturn = salesLine.qty - alreadyReturned;

            if (item.qtyReturned > availableToReturn) {
                throw new BadRequestException(
                    `Cannot return ${item.qtyReturned} of product ${salesLine.product.nameAr}. ` +
                    `Already returned: ${alreadyReturned}, Available: ${availableToReturn}`,
                );
            }
        }

        // Calculate total refund
        const totalRefund = items.reduce((sum, item) => sum + item.refundAmount, 0);

        // Generate return number
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const branchCode = salesInvoice.branch.code;

        const lastReturn = await this.prisma.salesReturn.findFirst({
            where: {
                returnNo: {
                    startsWith: `RET-${branchCode}-${dateStr}`,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        let sequence = 1;
        if (lastReturn) {
            const lastSequence = parseInt(lastReturn.returnNo.split('-').pop() || '0');
            sequence = lastSequence + 1;
        }

        const returnNo = `RET-${branchCode}-${dateStr}-${sequence.toString().padStart(4, '0')}`;

        // Create return with lines
        const salesReturn = await this.prisma.salesReturn.create({
            data: {
                returnNo,
                salesInvoiceId,
                branchId: salesInvoice.branchId,
                createdBy: userId,
                totalRefund: totalRefund,
                reason,
                lines: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        qtyReturned: item.qtyReturned,
                        refundAmount: item.refundAmount,
                    })),
                },
            },
            include: {
                lines: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        // Get the main stock location for this branch
        const stockLocation = await this.prisma.stockLocation.findFirst({
            where: {
                branchId: salesInvoice.branchId,
                active: true,
            },
        });

        if (!stockLocation) {
            throw new BadRequestException(
                `No active stock location found for branch ${salesInvoice.branch.name}`,
            );
        }

        // Create stock movements and audit logs
        const auditPromises = items.map(async (item) => {
            // Return items to inventory via stock movement
            await this.prisma.stockMovement.create({
                data: {
                    productId: item.productId,
                    stockLocationId: stockLocation.id,
                    qtyChange: item.qtyReturned, // Positive for returns
                    movementType: 'RETURN',
                    refTable: 'salesreturns',
                    refId: salesReturn.id,
                    notes: `Return from invoice ${salesInvoice.invoiceNo}`,
                    createdBy: userId,
                },
            });

            console.log(`📝 Creating audit log for return: Product ID ${item.productId}, Qty: ${item.qtyReturned}`);

            // Create audit log
            return this.prisma.productAudit.create({
                data: {
                    productId: item.productId,
                    action: 'UPDATE',
                    userId,
                    oldData: {
                        returnInfo: {
                            returnNo,
                            salesInvoiceNo: salesInvoice.invoiceNo,
                            qty: item.qtyReturned,
                            reason: reason || 'Return from sale',
                        },
                    },
                    newData: {
                        stockMovement: {
                            qtyChange: item.qtyReturned,
                            movementType: 'RETURN',
                        },
                    },
                },
            });
        });

        await Promise.all(auditPromises);

        console.log(`✅ Return ${returnNo} processed with ${items.length} audit logs created`);

        return salesReturn;
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        branchId?: number;
        salesInvoiceId?: number; // ✅ Add this
    }) {
        const { skip, take, branchId, salesInvoiceId } = params;

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (salesInvoiceId) where.salesInvoiceId = salesInvoiceId; // ✅ Add this

        const [data, total] = await Promise.all([
            this.prisma.salesReturn.findMany({
                skip,
                take,
                where,
                include: {
                    branch: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                        },
                    },
                    lines: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    nameAr: true,
                                    nameEn: true,
                                    barcode: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.salesReturn.count({ where }),
        ]);

        return { data, total };
    }

}
