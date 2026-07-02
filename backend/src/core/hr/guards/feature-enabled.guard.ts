import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY_METADATA } from '../decorators/require-feature.decorator';
import {
  FeatureFlagsService,
  FeatureKey,
} from '../services/feature-flags.service';

@Injectable()
export class FeatureEnabledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey | undefined>(
      FEATURE_KEY_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) return true;

    const enabled = await this.featureFlags.isEnabled(feature);
    if (!enabled) {
      throw new ForbiddenException(`Fitur "${feature}" tidak diaktifkan`);
    }

    return true;
  }
}
