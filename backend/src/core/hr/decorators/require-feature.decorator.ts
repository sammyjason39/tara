import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../services/feature-flags.service';

export const FEATURE_KEY_METADATA = 'tara_feature_key';

export const RequireFeature = (feature: FeatureKey) =>
  SetMetadata(FEATURE_KEY_METADATA, feature);
