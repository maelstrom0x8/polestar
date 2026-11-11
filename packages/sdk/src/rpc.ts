import { ContractPanicError, ViewError } from "./errors.js";
import { parsePreservingBigNumbers, utf8ToBase64 } from "./serialization.js";
import type { Block } from "./types.js";

export type ViewFn = (method: string, args: Record<string, unknown>, contractId: string) => Promise<unknown>;
export type BlockFn = (ref: "final" | number) => Promise<Block>;

interface RpcError {
  message?: string;
  cause?: { name?: string; info?: { error_message?: string } };
}

function panicMessage(raw: string): string {
  return /panic_msg: "([^"]*)"/.exec(raw)?.[1] ?? raw;
}

async function post(rpcUrl: string, fetchImpl: typeof fetch, label: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ViewError(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!res.ok) throw new ViewError(`${label}: RPC request failed (${res.status})`);
  return res.json();
}

export function rpcView(rpcUrl: string, fetchImpl: typeof fetch = globalThis.fetch): ViewFn {
  return async (method, args, contractId) => {
    const body = (await post(rpcUrl, fetchImpl, method, {
      jsonrpc: "2.0",
      id: "polestar-sdk",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "optimistic",
        account_id: contractId,
        method_name: method,
        args_base64: utf8ToBase64(JSON.stringify(args)),
      },
    })) as { error?: RpcError; result?: { result?: number[]; error?: string } };
    if (body.error) {
      if (body.error.cause?.name === "CONTRACT_EXECUTION_ERROR") {
        throw new ContractPanicError(method, panicMessage(body.error.cause.info?.error_message ?? ""));
      }
      throw new ViewError(`${method}: ${body.error.cause?.name ?? body.error.message ?? "unknown RPC error"}`);
    }
    if (body.result?.error !== undefined) throw new ContractPanicError(method, panicMessage(body.result.error));
    if (!body.result?.result) throw new ViewError(`${method}: malformed RPC response`);
    const text = new TextDecoder().decode(Uint8Array.from(body.result.result));
    return text ? parsePreservingBigNumbers(text) : undefined;
  };
}

export function rpcBlock(rpcUrl: string, fetchImpl: typeof fetch = globalThis.fetch): BlockFn {
  return async (ref) => {
    const body = (await post(rpcUrl, fetchImpl, "block", {
      jsonrpc: "2.0",
      id: "polestar-sdk",
      method: "block",
      params: ref === "final" ? { finality: "final" } : { block_id: ref },
    })) as { result?: { header: { height: number; timestamp_nanosec: string } } };
    if (!body.result) throw new ViewError("block: malformed RPC response");
    const { height, timestamp_nanosec } = body.result.header;
    return { height, timestampMs: Number(BigInt(timestamp_nanosec) / 1_000_000n) };
  };
}
