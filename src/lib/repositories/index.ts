/**
 * Repository entrypoint.
 *
 * Reads `NEXT_PUBLIC_REPOSITORY_ADAPTER` to decide which adapter to use.
 * Defaults to the dev adapter. In production set
 * `NEXT_PUBLIC_REPOSITORY_ADAPTER=prod` and provide a `prod-adapter.ts`
 * implementation backed by Supabase server actions.
 */

import { devRepositories } from "./dev-adapter";
import type { Repositories } from "./contracts";

const ADAPTER = process.env.NEXT_PUBLIC_REPOSITORY_ADAPTER ?? "dev";

let _repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (_repos) return _repos;
  if (ADAPTER === "prod") {
    // Lazy-load production adapter when it exists.
    // try {
    //   // eslint-disable-next-line @typescript-eslint/no-var-requires
    //   const mod = require("./prod-adapter");
    //   _repos = mod.prodRepositories;
    // } catch (e) {
    //   console.warn("Production adapter not available, falling back to dev.", e);
    //   _repos = devRepositories;
    // }
    _repos = devRepositories; // Until prod adapter exists, fall back to dev.
  } else {
    _repos = devRepositories;
  }
  return _repos;
}

export type { Repositories } from "./contracts";
