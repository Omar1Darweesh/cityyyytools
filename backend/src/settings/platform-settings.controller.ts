import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('settings/platforms')
//@UseGuards(JwtAuthGuard)
export class PlatformSettingsController {
    constructor(private platformSettingsService: PlatformSettingsService) { }

    @Get()
    getAllPlatforms() {
        return this.platformSettingsService.getAllPlatforms();
    }

    @Get(':platform')
    getPlatform(@Param('platform') platform: string) {
        return this.platformSettingsService.getPlatform(platform);
    }

    // 🆕 Create new platform
    @Post()
    createPlatform(
        @Body() body: {
            platform: string;
            name: string;
            icon?: string;
            taxRate: number;
            commission: number;
            active: boolean
        }
    ) {
        return this.platformSettingsService.upsertPlatform(body);
    }

    // Update existing platform
    @Put(':platform')
    updatePlatform(
        @Param('platform') platform: string,
        @Body() body: {
            name?: string;
            icon?: string;
            taxRate: number;
            commission: number;
            active: boolean
        }
    ) {
        return this.platformSettingsService.upsertPlatform({
            platform,
            ...body,
        });
    }

    // 🆕 Delete platform
    @Delete(':platform')
    deletePlatform(@Param('platform') platform: string) {
        return this.platformSettingsService.deletePlatform(platform);
    }

    @Put('initialize/defaults')
    initializeDefaults() {
        return this.platformSettingsService.initializeDefaultPlatforms();
    }
}
