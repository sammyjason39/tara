import {
  Injectable,
  Inject,
  Optional,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { HERMES_INTEGRATION_SERVICE } from './hermes.tokens';
import { HermesAuthorityLevel } from './hermes.interfaces';

/**
 * Minimal interface the host's integration service must satisfy for this guard.
 */
export interface IHermesIntegrationService {
  getConfig(): Promise<{
    enabled: boolean;
    api_key: string;
    agents: Array<{
      id: string;
      name: string;
      is_enabled: boolean;
      authority_level: string;
    }>;
  }>;
}

/**
 * Hermes API Key Guard
 *
 * Validates the `X-Hermes-Api-Key` header against registered Hermes agents.
 * On success, attaches the resolved agent context to `request.hermesAgent`.
 *
 * Usage: @UseGuards(HermesApiKeyGuard)
 *
 * Works in two modes:
 * 1. With injected HERMES_INTEGRATION_SERVICE token (plug-and-play module mode)
 * 2. With direct HermesIntegrationService injection (legacy flat registration mode)
 */
@Injectable()
export class HermesApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(HermesApiKeyGuard.name);
  private readonly hermesService: IHermesIntegrationService;

  constructor(
    @Inject(HERMES_INTEGRATION_SERVICE) @Optional() injectedService?: IHermesIntegrationService,
  ) {
    if (!injectedService) {
      throw new Error(
        'HermesApiKeyGuard requires HERMES_INTEGRATION_SERVICE. ' +
        'Use HermesModule.forRoot({ integrationService: YourService }) or provide the token manually.',
      );
    }
    this.hermesService = injectedService;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-hermes-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-Hermes-Api-Key header');
    }

    // Verify integration is enabled
    const config = await this.hermesService.getConfig();
    if (!config.enabled) {
      throw new ForbiddenException('Hermes integration is disabled');
    }

    // Validate the API key matches the configured key
    if (apiKey !== config.api_key) {
      this.logger.warn('Invalid Hermes API key attempt');
      throw new UnauthorizedException('Invalid Hermes API key');
    }

    // Resolve the agent from the X-Hermes-Agent-Id header (optional for multi-agent)
    const agentId = request.headers['x-hermes-agent-id'] as string;
    let resolvedAgent = config.agents[0]; // Default to first agent

    if (agentId) {
      const agent = config.agents.find((a) => a.id === agentId && a.is_enabled);
      if (!agent) {
        throw new ForbiddenException(`Hermes agent '${agentId}' not found or disabled`);
      }
      resolvedAgent = agent;
    }

    if (!resolvedAgent) {
      throw new ForbiddenException('No active Hermes agent configured');
    }

    // Attach agent context to request
    request.hermesAgent = {
      id: resolvedAgent.id,
      name: resolvedAgent.name,
      authority_level: resolvedAgent.authority_level as HermesAuthorityLevel,
    };

    return true;
  }
}

/**
 * Helper type for the resolved Hermes agent context on the request object.
 */
export interface HermesAgentContext {
  id: string;
  name: string;
  authority_level: HermesAuthorityLevel;
}
