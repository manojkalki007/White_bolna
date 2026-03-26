/**
 * smallestai.ts
 *
 * Provides two things:
 *  1. `smallestAI` — default singleton client using env vars (backward-compat)
 *  2. `getOrgClient(org)` — dynamic per-org client using org's own API key
 *
 * This is the core of multi-tenancy: every org has its own Smallest.ai
 * workspace credentials stored in the database. If the org hasn't set their
 * own key, we fall back to the global .env key.
 */

import axios, { AxiosInstance } from 'axios';

const DEFAULT_BASE_URL =
  process.env.SMALLEST_AI_BASE_URL ?? 'https://api.smallest.ai/atoms/v1';
const DEFAULT_API_KEY = process.env.SMALLEST_AI_API_KEY ?? '';

// ─── Default singleton (uses .env) ───────────────────────────────────────────
const smallestAI: AxiosInstance = axios.create({
  baseURL: DEFAULT_BASE_URL,
  headers: {
    Authorization: `Bearer ${DEFAULT_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

export default smallestAI;

// ─── Per-org factory ─────────────────────────────────────────────────────────
interface OrgCredentials {
  smallestAiApiKey?: string | null;
  smallestAiBaseUrl?: string | null;
}

/**
 * Returns an Axios instance scoped to the given org's Smallest.ai credentials.
 * Falls back to global env vars if the org hasn't configured their own key.
 */
export function getOrgClient(org: OrgCredentials): AxiosInstance {
  const apiKey = org.smallestAiApiKey ?? DEFAULT_API_KEY;
  const baseURL = org.smallestAiBaseUrl ?? DEFAULT_BASE_URL;

  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

// ─── Helper: initiate a call ─────────────────────────────────────────────────
export interface InitiateCallPayload {
  agent_id: string;
  phone_number: string;
  variables?: Record<string, string>;
}

export interface InitiateCallResponse {
  call_id?: string;   // snake_case as returned by Smallest.ai API
  callId?: string;    // camelCase alias (some API versions)
  status?: string;
  [key: string]: unknown;
}

export async function initiateCall(
  payload: InitiateCallPayload,
  org?: OrgCredentials
): Promise<InitiateCallResponse> {
  const client = org ? getOrgClient(org) : smallestAI;
  const res = await client.post<InitiateCallResponse>('/call', {
    agent_id: payload.agent_id,
    phone_number: payload.phone_number,
    variables: payload.variables ?? {},
  });
  return res.data;
}

export async function getCallDetails(callId: string, org?: OrgCredentials) {
  const client = org ? getOrgClient(org) : smallestAI;
  const res = await client.get(`/call/${callId}`);
  return res.data;
}
