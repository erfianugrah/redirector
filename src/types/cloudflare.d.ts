/**
 * Type definitions for Cloudflare workers.
 */
declare namespace Cloudflare {
  /**
   * KV namespace
   */
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string | ReadableStream | ArrayBuffer): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
      keys: { name: string; expiration?: number }[];
      list_complete: boolean;
      cursor?: string;
    }>;
  }
  
  /**
   * Execution context
   */
  interface ExecutionContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }
}

/**
 * Worker environment bindings
 */
interface WorkerEnv {
  REDIRECTS_KV: Cloudflare.KVNamespace;
  LOG_LEVEL: string;
  ENABLE_DEBUG: string;
}