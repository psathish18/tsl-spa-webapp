import OpenAI from 'openai';

const VERCEL_AI_GATEWAY_ENDPOINT = 'https://ai-gateway.vercel.sh/v1';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

export interface ResolvedAiClient {
  client: OpenAI;
  model: string;
  providerLabel: string;
  useVercelGateway: boolean;
  useGithubModels: boolean;
}

export interface ResolveAiClientOptions {
  useVercelGateway: boolean;
  useGithubModels: boolean;
  vercelModel: string;
  githubModel: string;
  openAiModel?: string;
}

export function resolveAiClient(options: ResolveAiClientOptions): ResolvedAiClient {
  const useVercelGateway = options.useVercelGateway;
  const useGithubModels = options.useGithubModels;

  if (useVercelGateway && useGithubModels) {
    throw new Error(
      [
        'Both provider booleans are enabled.',
        'Set only one of the following to true:',
        '  USE_VERCEL_AI_GATEWAY=true',
        '  USE_GITHUB_MODELS=true',
      ].join('\n')
    );
  }

  if (useVercelGateway) {
    if (!process.env.VERCEL_AI_GATEWAY_API_KEY) {
      throw new Error('USE_VERCEL_AI_GATEWAY=true but VERCEL_AI_GATEWAY_API_KEY is missing.');
    }

    return {
      client: new OpenAI({
        baseURL: VERCEL_AI_GATEWAY_ENDPOINT,
        apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
      }),
      model: options.vercelModel,
      providerLabel: 'Vercel AI Gateway (VERCEL_AI_GATEWAY_API_KEY)',
      useVercelGateway,
      useGithubModels,
    };
  }

  if (useGithubModels) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('USE_GITHUB_MODELS=true but GITHUB_TOKEN is missing.');
    }

    return {
      client: new OpenAI({
        baseURL: GITHUB_MODELS_ENDPOINT,
        apiKey: process.env.GITHUB_TOKEN,
      }),
      model: options.githubModel,
      providerLabel: 'GitHub Models API (GITHUB_TOKEN)',
      useVercelGateway,
      useGithubModels,
    };
  }

  // Optional explicit OpenAI path when both booleans are false.
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      model: options.openAiModel || options.githubModel,
      providerLabel: 'OpenAI API (OPENAI_API_KEY)',
      useVercelGateway,
      useGithubModels,
    };
  }

  throw new Error(
    [
      'No AI provider configured.',
      'Set one provider boolean to true and provide its key:',
      '  USE_VERCEL_AI_GATEWAY=true + VERCEL_AI_GATEWAY_API_KEY=...',
      '  USE_GITHUB_MODELS=true + GITHUB_TOKEN=ghp_...',
      'Or keep both false and use OPENAI_API_KEY=sk-... as fallback.',
      `Provider booleans: USE_VERCEL_AI_GATEWAY=${useVercelGateway}, USE_GITHUB_MODELS=${useGithubModels}`,
    ].join('\n')
  );
}
