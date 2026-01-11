import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PlatformSettingsService {
    constructor(private prisma: PrismaService) { }

    async getAllPlatforms() {
        return this.prisma.platformSettings.findMany({
            orderBy: { platform: 'asc' },
        });
    }

    async getPlatform(platform: string) {
        return this.prisma.platformSettings.findUnique({
            where: { platform },
        });
    }

    async upsertPlatform(data: {
        platform: string;
        name?: string;
        icon?: string;
        taxRate: number;
        commission: number;
        shippingFee: number; // ✅ ADD THIS
        active: boolean;
    }) {
        return this.prisma.platformSettings.upsert({
            where: { platform: data.platform },
            update: {
                taxRate: data.taxRate,
                commission: data.commission,
                shippingFee: data.shippingFee, // ✅ ADD THIS
                active: data.active,
                ...(data.name && { name: data.name }),
                ...(data.icon && { icon: data.icon }),
            },
            create: {
                platform: data.platform,
                name: data.name || data.platform,
                icon: data.icon || '🏪',
                taxRate: data.taxRate,
                commission: data.commission,
                shippingFee: data.shippingFee, // ✅ ADD THIS
                active: data.active,
            },
        });
    }

    async deletePlatform(platform: string) {
        return this.prisma.platformSettings.delete({
            where: { platform },
        });
    }

    async getTaxRate(platform: string): Promise<number> {
        const settings = await this.prisma.platformSettings.findUnique({
            where: { platform },
        });
        return settings?.taxRate ? Number(settings.taxRate) : 15;
    }

    // ✅ NEW METHOD
    async getShippingFee(platform: string): Promise<number> {
        const settings = await this.prisma.platformSettings.findUnique({
            where: { platform },
        });
        return settings?.shippingFee ? Number(settings.shippingFee) : 0;
    }

    async initializeDefaultPlatforms() {
        const platforms = [
            { platform: 'offline', name: 'offline', icon: '🏪', taxRate: 0, commission: 0, shippingFee: 0, active: true },
            { platform: 'Social', name: 'Social', icon: '📱', taxRate: 20, commission: 20, shippingFee: 0, active: true },
            { platform: 'Noon', name: 'Noon', icon: '🌙', taxRate: 70, commission: 20, shippingFee: 0, active: true },
            { platform: 'pogba', name: 'pogba', icon: '⚽', taxRate: 59, commission: 3, shippingFee: 0, active: true },
            { platform: 'Amazon', name: 'Amazon', icon: '📦', taxRate: 15, commission: 0, shippingFee: 0, active: true },
            { platform: 'Jumia', name: 'Jumia', icon: '🛍️', taxRate: 63, commission: 80, shippingFee: 0, active: true },
        ];

        for (const platform of platforms) {
            await this.upsertPlatform(platform);
        }

        return platforms;
    }
}
