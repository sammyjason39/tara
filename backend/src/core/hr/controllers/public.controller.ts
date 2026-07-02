import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { CompanyBrandingService } from '../services/company-branding.service';
import { FeatureFlagsService } from '../services/feature-flags.service';

/**
 * Public endpoints (no auth) — used on login page and initial app bootstrap.
 */
@Controller('public')
export class PublicController {
  constructor(
    private readonly brandingService: CompanyBrandingService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Get('branding')
  async getBranding() {
    const data = await this.brandingService.getPublicBranding();
    return { success: true, data };
  }

  @Get('features')
  async getFeatures() {
    const data = await this.featureFlags.getPublicFeatures();
    return { success: true, data };
  }

  @Get('logo')
  async getLogo(@Res() res: Response) {
    const logoPath = await this.brandingService.getLogoPathFromDb();
    if (!logoPath) {
      return res.status(404).json({ message: 'Logo not found' });
    }

    const ext = path.extname(logoPath).toLowerCase();
    const mime: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    res.setHeader('Content-Type', mime[ext] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(logoPath);
  }
}
