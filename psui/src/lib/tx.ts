import { CONTRACT_ID } from "./near";

export const TGAS = 10n ** 12n;

export interface ContractCall {
  method: string;
  args: Record<string, unknown>;
  deposit: bigint;
  gas: bigint;
}

export interface TxOutcome {
  hash: string | null;
  logs: string[];
  value: unknown;
}

/** The wallet was closed or the user declined to sign. Nothing was sent. */
export class TxCancelledError extends Error {}

/** The contract ran and refused (an ERR_* panic). Nothing changed on chain. */
export class TxRefusedError extends Error {
  readonly code: string;

  constructor(code: string, raw: string) {
    super(raw);
    this.code = code;
  }
}

/** Failed before anything could have reached the chain; safe to retry. */
export class TxNetworkError extends Error {}

/**
 * The wallet may have sent it, but no outcome came back. Never auto-retry:
 * a resent registration would create a duplicate project.
 */
export class TxUnknownError extends Error {}

/**
 * Exact JSON for the contract: bigints become bare integer literals, the
 * way its u128 arguments expect them. A JS number would round any amount
 * past 2^53 yoctoNEAR.
 */
export function contractJson(args: Record<string, unknown>, indent?: number): string {
  const json = JSON.stringify(args, (_k, v) => (typeof v === "bigint" ? `__big__${v}` : v), indent);
  return json.replace(/"__big__(\d+)"/g, "$1");
}

const CANCEL_PATTERN = /reject|cancel|denied|closed|user (?:closed|abort)/i;

function panicCode(text: string): string | null {
  return /\b(ERR_[A-Z_]+)\b/.exec(text)?.[1] ?? null;
}

interface RawOutcome {
  transaction?: { hash?: string };
  transaction_outcome?: { id?: string };
  receipts_outcome?: { outcome?: { logs?: string[] } }[];
  status?: { SuccessValue?: string; Failure?: unknown };
}

function readOutcome(raw: RawOutcome): TxOutcome {
  const hash = raw.transaction?.hash ?? raw.transaction_outcome?.id ?? null;
  const logs = (raw.receipts_outcome ?? []).flatMap((r) => r.outcome?.logs ?? []);
  if (raw.status && "Failure" in raw.status && raw.status.Failure !== undefined) {
    const text = JSON.stringify(raw.status.Failure);
    throw new TxRefusedError(panicCode(text) ?? "UNKNOWN", text);
  }
  let value: unknown = null;
  const encoded = raw.status?.SuccessValue;
  if (encoded) {
    try {
      value = JSON.parse(atob(encoded));
    } catch {
      value = null;
    }
  }
  return { hash, logs, value };
}

export async function sendCall(call: ContractCall): Promise<TxOutcome> {
  if (__MOCK_DATA__) {
    const { mockSend } = await import("./mock/tx");
    return mockSend(call);
  }

  const { getConnectedWallet } = await import("./wallet");
  const wallet = await getConnectedWallet().catch(() => {
    throw new TxNetworkError("No wallet is connected.");
  });

  let raw: RawOutcome;
  try {
    raw = (await wallet.signAndSendTransaction({
      receiverId: CONTRACT_ID,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: call.method,
            // Bytes, not an object: wallets pass Uint8Array args through
            // untouched, while an object would be re-serialized by JS and
            // lose u128 precision.
            args: new TextEncoder().encode(contractJson(call.args)) as unknown as object,
            gas: call.gas.toString(),
            deposit: call.deposit.toString(),
          },
        },
      ],
    })) as RawOutcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = panicCode(message);
    if (code) throw new TxRefusedError(code, message);
    if (CANCEL_PATTERN.test(message)) throw new TxCancelledError(message);
    throw new TxUnknownError(message);
  }
  return readOutcome(raw);
}

export function explorerTxUrl(hash: string): string {
  return `https://testnet.nearblocks.io/txns/${hash}`;
}
