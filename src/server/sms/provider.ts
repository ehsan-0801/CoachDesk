import "server-only";

/**
 * The seam a real gateway would plug into.
 *
 * Nothing in this build talks to a gateway: `SMS_ENABLED` is false and the only
 * registered adapter is `noop`. Turning delivery on later means writing one
 * adapter that satisfies `SmsProvider` and registering it below — no caller
 * anywhere else in the app changes.
 */
export interface OutboundSms {
  messageId: number;
  phone: string;
  body: string;
}

export interface SmsSendResult {
  messageId: number;
  ok: boolean;
  providerRef?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(messages: OutboundSms[]): Promise<SmsSendResult[]>;
  balance?(): Promise<{ balance: number; currency: string } | null>;
}

/** Accepts everything and delivers nothing. Keeps the pipeline exercisable. */
const noopProvider: SmsProvider = {
  name: "noop",
  async send(messages) {
    return messages.map((m) => ({
      messageId: m.messageId,
      ok: false,
      error: "no_provider_configured",
    }));
  },
  async balance() {
    return null;
  },
};

const PROVIDERS: Record<string, SmsProvider> = {
  noop: noopProvider,
};

export function getProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? "noop";
  return PROVIDERS[name] ?? noopProvider;
}

export function isSmsEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}
