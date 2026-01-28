import { GraphQLClient } from "graphql-request";
import { safeFetchJson, type SafeResult } from "@/lib/net/safe-fetch";

type ClientOpts = { revalidate?: number; tags?: string[] };

function resolveEndpoint() {
  return (
    process.env.WP_GRAPHQL_ENDPOINT ||
    process.env.NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT ||
    ""
  ).trim();
}

/**
 * "Normal" GraphQLClient (can still throw if endpoint missing).
 * Keep this for places you want strict behavior.
 */
export function gqlClient(opts?: ClientOpts) {
  const endpoint = resolveEndpoint();

  if (!endpoint) {
    throw new Error(
      "Missing WP GraphQL endpoint. Set WP_GRAPHQL_ENDPOINT (recommended) or NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT in .env.local. Example: WP_GRAPHQL_ENDPOINT=https://cms.bisogo.ph/graphql"
    );
  }

  const headers: Record<string, string> = {};

  return new GraphQLClient(endpoint, {
    headers,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        next: {
          revalidate: opts?.revalidate ?? 600,
          tags: opts?.tags ?? [],
        },
      }),
  });
}

/**
 * ✅ Safe GraphQL request:
 * - Never throws
 * - Times out
 * - Returns { ok, data | error }
 */
export async function gqlSafeRequest<T>(
  query: string,
  variables?: any,
  opts?: { revalidate?: number; tags?: string[]; timeoutMs?: number }
): Promise<SafeResult<T>> {
  const endpoint = resolveEndpoint();
  if (!endpoint) return { ok: false, error: "WP_GRAPHQL_ENDPOINT not set" };

  const res = await safeFetchJson<{ data?: T; errors?: any[] }>(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    // Next cache controls
    next: {
      revalidate: opts?.revalidate ?? 600,
      tags: opts?.tags ?? [],
    } as any,
    timeoutMs: opts?.timeoutMs ?? 8000,
  } as any);

  if (!res.ok) return res;

  if (res.data.errors?.length) {
    return {
      ok: false,
      error: res.data.errors[0]?.message || "GraphQL error",
    };
  }

  if (!res.data.data) return { ok: false, error: "No data returned" };

  return { ok: true, data: res.data.data };
}