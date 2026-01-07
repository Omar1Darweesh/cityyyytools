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
        active: boolean;
    }) {
        return this.prisma.platformSettings.upsert({
            where: { platform: data.platform },
            update: {
                taxRate: data.taxRate,
                commission: data.commission,
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
                active: data.active,
            },
        });
    }

    // 🆕 Delete platform
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

    async initializeDefaultPlatforms() {
        const platforms = [
            { platform: 'NORMAL', name: 'عادي', icon: '🏪', taxRate: 15, commission: 0, active: true },
            { platform: 'NOON', name: 'نون', icon: '🌙', taxRate: 15, commission: 12, active: true },
            { platform: 'AMAZON', name: 'أمازون', icon: '📦', taxRate: 15, commission: 15, active: true },
            { platform: 'SALLA', name: 'سلة', icon: '🛍️', taxRate: 15, commission: 8, active: true },
            { platform: 'ZID', name: 'زد', icon: '⚡', taxRate: 15, commission: 8, active: true },
        ];

        for (const platform of platforms) {
            await this.upsertPlatform(platform);
        }

        return platforms;
    }
}
