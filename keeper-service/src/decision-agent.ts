import { AgentMode, HederaLangchainToolkit } from "hedera-agent-kit";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";

import { createHederaOperatorClient } from "./clients.js";
import { config, hasDecisionAgentConfig } from "./config.js";
import type { KeeperContext, KeeperDecision, RebalanceParams, RegimeProfile } from "./types.js";
import { absInt, extractJsonBlock } from "./utils.js";

interface DecisionAgentRuntime {
  agent: {
    invoke: (
      input: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<{ messages?: Array<{ content?: unknown }> }>;
  };
  toolkit: HederaLangchainToolkit;
}

let decisionAgentRuntimePromise: Promise<DecisionAgentRuntime | null> | null = null;

interface DecisionPromptFeedback {
  previousDecision?: KeeperDecision;
  failureReason?: string;
  repairAttempt?: number;
  fallbackToBaseline?: boolean;
}

function alignTick(value: number): number {
  return Math.round(value / config.tickSpacing) * config.tickSpacing;
}

function buildCenteredRange(
  currentTick: number,
  profile: RegimeProfile,
): Omit<RebalanceParams, "swapQuantity"> {
  const center = alignTick(currentTick);
  return {
    baseLower: center - profile.baseHalfWidth,
    baseUpper: center + profile.baseHalfWidth,
    limitLower: center - profile.limitHalfWidth,
    limitUpper: center + profile.limitHalfWidth,
  };
}

export function buildBaselineDecision(context: KeeperContext): KeeperDecision {
  if (context.pool.state !== "Active") {
    return {
      action: "noop",
      reasoning: [
        context.pool.state === "Completed"
          ? "Pool is completed, so keeper monitoring and execution are disabled."
          : "Pool is not active, so keeper should not intervene.",
      ],
      params: null,
      source: "rules-fallback",
    };
  }

  if (context.vault.pendingFeeAssets >= config.feeCollectionThreshold) {
    return {
      action: "collectFees",
      reasoning: [
        "Pending fees crossed the configured collection threshold.",
        "Collecting fees before the next rebalance keeps vault accounting cleaner.",
      ],
      params: null,
      source: "rules-fallback",
    };
  }

  const profile = config.regimeProfiles[context.market.volatilityRegime] ?? config.regimeProfiles.medium;
  const targetRange = buildCenteredRange(context.vault.currentTick, profile);
  const currentMid = (context.vault.baseLower + context.vault.baseUpper) / 2;
  const drift = absInt(context.vault.currentTick - currentMid);
  const currentHalfWidth = Math.max(1, (context.vault.baseUpper - context.vault.baseLower) / 2);
  const driftRatio = drift / currentHalfWidth;
  const outOfRange =
    context.vault.currentTick <= context.vault.baseLower ||
    context.vault.currentTick >= context.vault.baseUpper;
  const rangeMismatch =
    context.vault.baseLower !== targetRange.baseLower ||
    context.vault.baseUpper !== targetRange.baseUpper ||
    context.vault.limitLower !== targetRange.limitLower ||
    context.vault.limitUpper !== targetRange.limitUpper;

  if (outOfRange || rangeMismatch || driftRatio >= 0.7) {
    return {
      action: "rebalance",
      reasoning: [
        `Detected ${context.market.volatilityRegime} volatility regime for ${config.pairLabel}.`,
        outOfRange
          ? "Current tick moved outside the active base range."
          : "Current range no longer matches the target profile for this regime.",
        `Drift ratio is ${driftRatio.toFixed(2)}, so centering liquidity is justified.`,
      ],
      params: {
        ...targetRange,
        swapQuantity:
          context.vault.totalAssets > 0n && drift !== 0
            ? (context.vault.currentTick > currentMid
                ? -(context.vault.totalAssets / 100n)
                : context.vault.totalAssets / 100n
              ).toString()
            : "0",
      },
      source: "rules-fallback",
    };
  }

  return {
    action: "noop",
    reasoning: [
      `Current ${config.pairLabel} range already matches the ${context.market.volatilityRegime} regime.`,
      "Pending fees are still below the collection threshold.",
    ],
    params: null,
    source: "rules-fallback",
  };
}

async function getDecisionAgentRuntime(): Promise<DecisionAgentRuntime | null> {
  if (!hasDecisionAgentConfig()) return null;

  if (!decisionAgentRuntimePromise) {
    decisionAgentRuntimePromise = (async () => {
      const client = createHederaOperatorClient();
      if (!client) return null;

      const toolkit = new HederaLangchainToolkit({
        client: client as never,
        configuration: {
          tools: [],
          plugins: [],
          context: {
            mode: AgentMode.AUTONOMOUS,
          },
        },
      });

      const agent = createAgent({
        model: new ChatGroq({
          model: config.groqModel,
          apiKey: config.groqApiKey,
        }),
        // Decision generation should stay pure reasoning. Keep HAK runtime initialized,
        // but do not expose execution tools into the reasoning loop.
        tools: [],
        systemPrompt: [
          "You are Sanca's volatility-aware keeper decision agent.",
          "You analyze HBAR/USDC vault context and decide one action only: rebalance, collectFees, or noop.",
          "Do not execute transactions.",
          "If action is rebalance, your params must obey all hard constraints.",
          "Hard constraints for rebalance params:",
          "- baseLower < baseUpper",
          "- limitLower < limitUpper",
          "- limitLower < baseLower < baseUpper < limitUpper",
          "- every range bound must be an integer aligned to tickSpacing",
          '- swapQuantity must be an integer string like "0" or "-1000000"',
          "If you receive a previous failure reason, fix the proposal instead of repeating the same invalid range.",
          "Return strict JSON only with this shape:",
          '{"action":"rebalance|collectFees|noop","reasoning":["..."],"params":{"baseLower":-120,"baseUpper":120,"limitLower":-360,"limitUpper":360,"swapQuantity":"0"}|null}',
        ].join(" "),
        checkpointer: new MemorySaver(),
      });

      return {
        agent: agent as unknown as DecisionAgentRuntime["agent"],
        toolkit,
      };
    })().catch((error) => {
      decisionAgentRuntimePromise = null;
      throw error;
    });
  }

  return decisionAgentRuntimePromise;
}

function normalizeDecisionPayload(
  payload: Record<string, unknown>,
  baselineDecision: KeeperDecision,
): KeeperDecision {
  const action =
    payload.action === "rebalance" || payload.action === "collectFees" || payload.action === "noop"
      ? payload.action
      : baselineDecision.action;
  const reasoning =
    Array.isArray(payload.reasoning) && payload.reasoning.length > 0
      ? payload.reasoning.map(String)
      : baselineDecision.reasoning;

  if (action !== "rebalance") {
    return {
      action,
      reasoning,
      params: null,
      source: "groq-agent",
    };
  }

  const params = payload.params as Record<string, unknown> | undefined;
  if (!params) {
    return {
      ...baselineDecision,
      source: "rules-fallback",
    };
  }

  return {
    action,
    reasoning,
    params: {
      baseLower: Number(params.baseLower),
      baseUpper: Number(params.baseUpper),
      limitLower: Number(params.limitLower),
      limitUpper: Number(params.limitUpper),
      swapQuantity: String(params.swapQuantity ?? "0"),
    },
    source: "groq-agent",
  };
}

function stringifyForPrompt(value: unknown): string {
  return JSON.stringify(value, (_key, current) => (typeof current === "bigint" ? current.toString() : current));
}

function responseToText(response: { messages?: Array<{ content?: unknown }> }): string {
  const content = response.messages?.at(-1)?.content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        typeof item === "object" && item && "text" in item
          ? String((item as { text?: unknown }).text ?? "")
          : JSON.stringify(item),
      )
      .join("\n");
  }
  return String(content ?? "");
}

function buildDecisionPrompt(
  context: KeeperContext,
  baselineDecision: KeeperDecision,
  feedback?: DecisionPromptFeedback,
): string {
  const sections = [
    "Analyze this keeper context and return JSON only.",
    `Context: ${stringifyForPrompt(context)}`,
    `Baseline recommendation: ${stringifyForPrompt(baselineDecision)}`,
    "Constraints:",
    "- action must be one of rebalance, collectFees, noop",
    "- use null params unless action is rebalance",
    "- keep reasoning concise",
    `- tickSpacing is ${config.tickSpacing}`,
    "- for rebalance params: baseLower < baseUpper",
    "- for rebalance params: limitLower < limitUpper",
    "- for rebalance params: limitLower < baseLower < baseUpper < limitUpper",
    "- all range bounds must already be aligned to tickSpacing",
    '- swapQuantity must be an integer string',
  ];

  if (feedback?.previousDecision) {
    sections.push(`Previous proposal: ${stringifyForPrompt(feedback.previousDecision)}`);
  }

  if (feedback?.failureReason) {
    sections.push(`Previous proposal failed with reason: ${feedback.failureReason}`);
  }

  if (feedback?.repairAttempt) {
    sections.push(`This is repair attempt #${feedback.repairAttempt}. Return a corrected proposal.`);
  }

  return sections.join("\n");
}

export async function buildDecisionForContext(
  context: KeeperContext,
  feedback?: DecisionPromptFeedback,
): Promise<KeeperDecision> {
  const baselineDecision = buildBaselineDecision(context);
  const runtime = await getDecisionAgentRuntime();
  if (!runtime) return baselineDecision;

  const prompt = buildDecisionPrompt(context, baselineDecision, feedback);

  try {
    const response = await runtime.agent.invoke(
      {
        messages: [{ role: "user", content: prompt }],
      },
      {
        configurable: {
          thread_id: `decision-${context.pool.address}-${Date.now()}`,
        },
      },
    );

    const payload = extractJsonBlock(responseToText(response));
    if (!payload) {
      if (feedback?.fallbackToBaseline === false) {
        throw new Error("Decision repair failed: model did not return a valid JSON payload");
      }
      return baselineDecision;
    }
    return normalizeDecisionPayload(payload, baselineDecision);
  } catch (_error) {
    if (feedback?.fallbackToBaseline === false) {
      throw _error;
    }
    return baselineDecision;
  }
}
