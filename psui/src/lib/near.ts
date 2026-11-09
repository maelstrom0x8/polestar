export const RPC_URL = import.meta.env.VITE_NEAR_RPC_URL ?? "https://test.rpc.fastnear.com";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "budgeting.polestar-dev.testnet";
/** The SputnikDAO instance this deployment was initialized with. */
export const DAO_ID = import.meta.env.VITE_DAO_ID ?? "dao.polestar-dev.testnet";


/** The RPC itself failed (network, HTTP status, malformed response). */
export class ViewCallError extends Error {}

/** The RPC answered, but the contract panicked while running the view. */
export class ContractPanicError extends ViewCallError {
  readonly panic: string;

  constructor(methodName: string, panic: string) {
    super(`${methodName}: ${panic}`);
    this.panic = panic;
  }
}

interface RpcResponse {
  error?: { message?: string; data?: unknown; cause?: { name?: string; info?: { error_message?: string } } };
  result?: { result?: number[]; error?: string };
}

function panicMessage(raw: string): string {
  return /panic_msg: "([^"]*)"/.exec(raw)?.[1] ?? raw;
}

/**
 * This contract's RoundId/ProjectId are plain `u64` type aliases, not
 * near_sdk::json_types::U64 — confirmed directly against the deployed
 * testnet contract (budgeting.polestar-dev.testnet), not assumed from
 * the usual NEAR convention: get_round_count returned a bare `4`, and
 * get_round returned bare numbers for every u64/u128 field, including
 * `"budget":1000000000000000000000000` (a yoctoNEAR u128 that exceeds
 * Number.MAX_SAFE_INTEGER by nine orders of magnitude). Plain
 * JSON.parse would silently round that to the nearest representable
 * double — a real financial-correctness bug, not a style issue. This
 * wraps any bare numeric literal of 16+ digits (the point past which
 * an integer can no longer be represented exactly as a JS double) in
 * quotes before parsing, so it survives as a string instead.
 */
export function parsePreservingBigNumbers(json: string): unknown {
  const trimmed = json.trim();
  if (/^\d{16,}$/.test(trimmed)) return JSON.parse(`"${trimmed}"`);
  return JSON.parse(json.replace(/(?<=[:,[])(\d{16,})(?=[,}\]])/g, '"$1"'));
}

/**
 * A single NEAR view call, via the plain JSON-RPC `query` endpoint —
 * no wallet, no signing, nothing near-api-js brings that a view call
 * actually needs. Args are the small set of plain account ids and
 * numeric ids these 9 methods take, so plain btoa is enough; nothing
 * here carries non-ASCII content. Numeric ids (round_id, project_id)
 * go as plain JSON numbers, not strings — confirmed against the real
 * contract the same way as the response shape above.
 */
export async function viewFunction<T>(
  methodName: string,
  args: Record<string, unknown> = {},
  contractId = CONTRACT_ID,
): Promise<T> {
  if (__MOCK_DATA__) {
    const { mockView } = await import("./mock/views");
    return mockView(methodName, args, contractId) as T;
  }

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "psui",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "optimistic",
        account_id: contractId,
        method_name: methodName,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });

  if (!res.ok) {
    throw new ViewCallError(`${methodName}: RPC request failed (${res.status})`);
  }

  const body = (await res.json()) as RpcResponse;
  if (body.error) {
    if (body.error.cause?.name === "CONTRACT_EXECUTION_ERROR") {
      throw new ContractPanicError(methodName, panicMessage(body.error.cause.info?.error_message ?? ""));
    }
    const detail = body.error.cause?.name ?? body.error.message ?? "unknown RPC error";
    throw new ViewCallError(`${methodName}: ${detail}`);
  }
  if (body.result?.error !== undefined) {
    throw new ContractPanicError(methodName, panicMessage(body.result.error));
  }
  if (!body.result?.result) {
    throw new ViewCallError(`${methodName}: malformed RPC response`);
  }

  const bytes = Uint8Array.from(body.result.result);
  const text = new TextDecoder().decode(bytes);
  return (text ? parsePreservingBigNumbers(text) : undefined) as T;
}

export interface BlockRef {
  height: number;
  timestampMs: number;
}

/** A block header's height and time; "final" for the chain head. */
export async function getBlock(ref: "final" | number): Promise<BlockRef> {
  if (__MOCK_DATA__) {
    const { mockBlock } = await import("./mock/views");
    return mockBlock(ref);
  }
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "psui",
      method: "block",
      params: ref === "final" ? { finality: "final" } : { block_id: ref },
    }),
  });
  if (!res.ok) throw new ViewCallError(`block: RPC request failed (${res.status})`);
  const body = (await res.json()) as { result?: { header: { height: number; timestamp_nanosec: string } } };
  if (!body.result) throw new ViewCallError("block: malformed RPC response");
  const { height, timestamp_nanosec } = body.result.header;
  return { height, timestampMs: Number(BigInt(timestamp_nanosec) / 1_000_000n) };
}
