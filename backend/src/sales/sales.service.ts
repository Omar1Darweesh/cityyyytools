import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './dto/sales.dto';
import { MovementType, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) { }

  async createSale(createSaleDto: CreateSaleDto, userId: number) {
    const {
      branchId,
      customerId,
      lines,
      paymentMethod,
      totalDiscount = 0,
      stockLocationId,
      notes,
      channel,
      platformCommission = 0,
      shippingFee = 0, // ✅ NEW: Add shipping fee
    } = createSaleDto;

    // Find default stock location if not provided
    let locationId = stockLocationId;
    if (!locationId) {
      const defaultLocation = await this.prisma.stockLocation.findFirst({
        where: { branchId, active: true },
      });

      if (!defaultLocation) {
        throw new BadRequestException('No active stock location found for this branch');
      }

      locationId = defaultLocation.id;
    }

    // FIXED CALCULATION LOGIC
    let rawSubtotal = 0;
    const enrichedLines: any[] = [];

    // Step 1: Calculate raw subtotal and validate products
    for (const line of lines) {
      const product = await this.prisma.product.findUnique({
        where: { id: line.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${line.productId} not found`);
      }

      if (!product.active) {
        throw new BadRequestException(`Product ${product.nameEn} is inactive`);
      }

      const lineSubtotal = line.qty * line.unitPrice;
      rawSubtotal += lineSubtotal;

      enrichedLines.push({
        ...line,
        lineDiscount: line.lineDiscount || 0,
        taxRate: line.taxRate || 0,
      });
    }

    // Step 2: Apply global discount
    const subtotalAfterDiscount = rawSubtotal - totalDiscount;

    // Step 3: Calculate tax proportionally
    let totalTax = 0;
    for (const line of enrichedLines) {
      const lineRawSubtotal = line.qty * line.unitPrice;
      const lineDiscountAmount = (lineRawSubtotal / rawSubtotal) * totalDiscount;
      const lineSubtotalAfterDiscount = lineRawSubtotal - lineDiscountAmount;
      const lineTax = (lineSubtotalAfterDiscount * line.taxRate) / 100;
      totalTax += lineTax;
      line.lineTotal = lineSubtotalAfterDiscount + lineTax;
    }

    // Step 4: Calculate final total
    const total = subtotalAfterDiscount + totalTax;

    // ✅ Step 5: Calculate Profit
    let costOfGoods = 0;
    for (const line of enrichedLines) {
      const product = await this.prisma.product.findUnique({
        where: { id: line.productId },
        select: { cost: true },
      });

      if (product && product.cost) {
        costOfGoods += Number(product.cost) * line.qty;
      }
    }

    // What customer actually paid (INCLUDING tax)
    const customerPayment = total;

    // Gross Profit = Revenue after tax - Cost
    const revenueAfterTax = subtotalAfterDiscount;
    const grossProfit = revenueAfterTax - costOfGoods;

    // ✅ UPDATED: Net Profit = Gross Profit - Commission - Shipping Fee
    const netProfit = grossProfit - platformCommission - shippingFee;

    // ✅ FIXED: Profit margin against what CUSTOMER PAID (not revenue after tax)
    const profitMargin = customerPayment > 0 ? (netProfit / customerPayment) * 100 : 0;

    console.log('💰 Profit Calculation:');
    console.log('Customer Paid (total):', customerPayment.toFixed(2));
    console.log('Tax Component:', totalTax.toFixed(2));
    console.log('Revenue (after tax):', revenueAfterTax.toFixed(2));
    console.log('Cost of Goods:', costOfGoods.toFixed(2));
    console.log('Gross Profit:', grossProfit.toFixed(2));
    console.log('Platform Commission:', platformCommission.toFixed(2));
    console.log('Shipping Fee:', shippingFee.toFixed(2)); // ✅ NEW
    console.log('Net Profit:', netProfit.toFixed(2));
    console.log('Profit Margin:', profitMargin.toFixed(2) + '%');
    console.log(' ^ Calculated as: (' + netProfit.toFixed(2) + ' / ' + customerPayment.toFixed(2) + ') × 100');

    // Generate invoice number
    const invoiceNo = await this.generateInvoiceNo(branchId);

    // Create sale in transaction
    return this.prisma.$transaction(async (tx) => {
      // Create sales invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          branchId,
          customerId,
          subtotal: new Prisma.Decimal(rawSubtotal),
          total: new Prisma.Decimal(total),
          totalTax: new Prisma.Decimal(totalTax),
          totalDiscount: new Prisma.Decimal(totalDiscount),
          paymentStatus: PaymentStatus.PAID,
          paymentMethod,
          notes,
          createdBy: userId,
          lines: {
            create: enrichedLines.map((line) => ({
              productId: line.productId,
              qty: line.qty,
              unitPrice: new Prisma.Decimal(line.unitPrice),
              lineDiscount: new Prisma.Decimal(line.lineDiscount),
              taxRate: new Prisma.Decimal(line.taxRate),
              lineTotal: new Prisma.Decimal(line.lineTotal),
            })),
          },
          channel,
          platformCommission: new Prisma.Decimal(platformCommission),
          shippingFee: new Prisma.Decimal(shippingFee), // ✅ NEW
          // ✅ NEW: Add profit fields
          costOfGoods: new Prisma.Decimal(costOfGoods),
          grossProfit: new Prisma.Decimal(grossProfit),
          netProfit: new Prisma.Decimal(netProfit),
          profitMargin: new Prisma.Decimal(profitMargin),
        },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      // Create stock movements
      for (const line of enrichedLines) {
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            stockLocationId: locationId,
            qtyChange: -line.qty,
            movementType: MovementType.SALE,
            refTable: 'sales_invoices',
            refId: invoice.id,
            createdBy: userId,
          },
        });
      }

      return invoice;
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    branchId?: number;
    customerId?: number;
    search?: string;
    paymentMethod?: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { skip, take, branchId, customerId, search, paymentMethod, dateFilter, startDate, endDate } = params;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (customerId) where.customerId = customerId;

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod;
    }

    // Date filter logic
    if (dateFilter || (startDate && endDate)) {
      let start: Date | undefined;
      let end: Date | undefined;
      const now = new Date();

      switch (dateFilter) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          end = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          start = new Date(yesterday.setHours(0, 0, 0, 0));
          end = new Date(yesterday.setHours(23, 59, 59, 999));
          break;
        case 'thisWeek':
          const weekStart = new Date();
          const dayOfWeek = weekStart.getDay();
          weekStart.setDate(weekStart.getDate() - dayOfWeek);
          start = new Date(weekStart.setHours(0, 0, 0, 0));
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case 'thisMonth':
          const monthStart = new Date();
          start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case 'custom':
          if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }

      if (start && end) {
        where.createdAt = {
          gte: start,
          lte: end,
        };
      }
    }

    if (search) {
      where.OR = [{ invoiceNo: { contains: search } }, { customer: { name: { contains: search } } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
          branch: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.salesInvoice.count({ where }),
    ]);

    // Convert Decimal to number for frontend
    const itemsWithNumbers = items.map((sale) => ({
      ...sale,
      subtotal: Number(sale.subtotal),
      total: Number(sale.total),
      totalTax: Number(sale.totalTax),
      totalDiscount: Number(sale.totalDiscount),
      platformCommission: Number(sale.platformCommission),
      shippingFee: Number(sale.shippingFee), // ✅ NEW
      costOfGoods: sale.costOfGoods ? Number(sale.costOfGoods) : undefined,
      grossProfit: sale.grossProfit ? Number(sale.grossProfit) : undefined,
      netProfit: sale.netProfit ? Number(sale.netProfit) : undefined,
      profitMargin: sale.profitMargin ? Number(sale.profitMargin) : undefined,
    }));

    return {
      data: itemsWithNumbers,
      total,
    };
  }

  async findOne(id: number) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        branch: {
          select: { name: true },
        },
        customer: {
          select: { name: true, type: true },
        },
        user: {
          select: { id: true, username: true, fullName: true },
        },
        lines: {
          include: {
            product: {
              select: {
                nameAr: true,
                nameEn: true,
                barcode: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // ✅ Convert Decimal to number
    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      total: Number(invoice.total),
      totalTax: Number(invoice.totalTax),
      totalDiscount: Number(invoice.totalDiscount),
      platformCommission: Number(invoice.platformCommission),
      shippingFee: Number(invoice.shippingFee), // ✅ NEW
      costOfGoods: invoice.costOfGoods ? Number(invoice.costOfGoods) : undefined,
      grossProfit: invoice.grossProfit ? Number(invoice.grossProfit) : undefined,
      netProfit: invoice.netProfit ? Number(invoice.netProfit) : undefined,
      profitMargin: invoice.profitMargin ? Number(invoice.profitMargin) : undefined,
      lines: invoice.lines.map((line) => ({
        ...line,
        unitPrice: Number(line.unitPrice),
        lineDiscount: Number(line.lineDiscount),
        taxRate: Number(line.taxRate),
        lineTotal: Number(line.lineTotal),
      })),
    };
  }

  async getDailySummary(branchId: number, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        branchId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        invoiceNo: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const summary = invoices.reduce(
      (acc, invoice) => {
        const method = invoice.paymentMethod;
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }

        acc[method].count++;
        acc[method].total += Number(invoice.total);
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    const grandTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);

    return {
      date: targetDate,
      branchId,
      summary,
      grandTotal,
      invoiceCount: invoices.length,
      recentSales: invoices.map((inv) => ({
        ...inv,
        total: Number(inv.total),
      })),
    };
  }

  private async generateInvoiceNo(branchId: number): Promise<string> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastInvoice = await this.prisma.salesInvoice.findFirst({
      where: {
        branchId,
        invoiceNo: {
          startsWith: `${branch.code}-${datePrefix}`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNo.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `${branch.code}-${datePrefix}-${String(sequence).padStart(4, '0')}`;
  }
}
