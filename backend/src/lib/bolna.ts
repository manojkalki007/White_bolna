/**
 * bolna.ts
 *
 * Bolna API abstraction layer.
 *
 * Provides:
 *  1. `bolnaClient`  — default singleton (uses BOLNA_API_KEY env var)
 *  2. `getOrgClient(org)` — per-tenant client using org's own Bolna key
 *  3. Typed helpers: createAgent, updateAgent, initiateCall, getCallDetails
 *
 * API reference: https://docs.bolna.dev
 * Base URL: https://api.bolna.dev
 */

import axios, { AxiosInstance } from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
export const BOLNA_DEFAULT_BASE_URL =
  process.env.BOLNA_BASE_URL ?? 'https://api.bolna.dev';

const BOLNA_API_KEY = process.env.BOLNA_API_KEY ?? '';

// ─── Default singleton (uses .env master key) ─────────────────────────────────
const bolnaClient: AxiosInstance = axios.create({
  baseURL: BOLNA_DEFAULT_BASE_URL,
  headers: {
    Authorization: `Bearer ${BOLNA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

export default bolnaClient;

// ─── Per-org factory ──────────────────────────────────────────────────────────
export interface OrgBolnaCredentials {
  bolnaApiKey?: string | null;
  bolnaBaseUrl?: string | null;
}

/**
 * Returns an Axios instance scoped to a specific tenant's Bolna API key.
 * Falls back to the global .env key if the org hasn't set their own.
 */
export function getOrgClient(org: OrgBolnaCredentials): AxiosInstance {
  const apiKey = org.bolnaApiKey ?? BOLNA_API_KEY;
  const baseURL = org.bolnaBaseUrl ?? BOLNA_DEFAULT_BASE_URL;

  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions — Bolna API Shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface BolnaLLMConfig {
  model: string;             // "gpt-4o-mini" | "gpt-4o" | "claude-3-haiku" | "llama-3-70b"
  max_tokens?: number;
  temperature?: number;
  system_prompt: string;
}

export interface BolnaVoiceConfig {
  voice_id: string;          // e.g. "ritu", "arman", or ElevenLabs voice ID
  provider?: string;         // "bolna" | "eleven_labs" | "azure_tts"
  language?: string;         // "en" | "hi" | "es" etc.
}

export interface BolnaLatencyConfig {
  ambient_noise_detection?: boolean;
  interruption_threshold?: number; // 0.0–1.0
  buffering_delay_ms?: number;     // milliseconds
}

export interface CreateAgentPayload {
  agent_name: string;
  agent_type?: string; // "IVR" | "conversation"
  agent_welcome_message?: string;
  llm_config: BolnaLLMConfig;
  voice_config: BolnaVoiceConfig;
  latency_config?: BolnaLatencyConfig;
  tasks?: Record<string, unknown>[];
}

export interface BolnaAgentResponse {
  agent_id: string;
  agent_name: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface InitiateCallPayload {
  agent_id: string;                    // Bolna agent ID
  recipient_phone_number: string;      // E.164 e.g. "+919876543210"
  from_phone_number?: string;          // Twilio/Plivo DID (optional if set on agent)
  user_data?: Record<string, string>;  // dynamic variables injected into prompt
}

export interface BolnaCallResponse {
  call_id: string;
  status: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Bolna agent for an organization.
 */
export async function createBolnaAgent(
  payload: CreateAgentPayload,
  org?: OrgBolnaCredentials
): Promise<BolnaAgentResponse> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.post<BolnaAgentResponse>('/agent', payload);
  return res.data;
}

/**
 * Update an existing Bolna agent.
 */
export async function updateBolnaAgent(
  agentId: string,
  payload: Partial<CreateAgentPayload>,
  org?: OrgBolnaCredentials
): Promise<BolnaAgentResponse> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.put<BolnaAgentResponse>(`/agent/${agentId}`, payload);
  return res.data;
}

/**
 * List all Bolna agents for an org's workspace.
 */
export async function listBolnaAgents(
  org?: OrgBolnaCredentials
): Promise<BolnaAgentResponse[]> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.get('/agent/all');
  // Bolna returns { agents: [...] } or a direct array
  return res.data?.agents ?? res.data?.data ?? res.data ?? [];
}

/**
 * Get a single Bolna agent by ID.
 */
export async function getBolnaAgent(
  agentId: string,
  org?: OrgBolnaCredentials
): Promise<BolnaAgentResponse> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.get<BolnaAgentResponse>(`/agent/${agentId}`);
  return (res.data?.data ?? res.data) as BolnaAgentResponse;
}

/**
 * Initiate an outbound call via Bolna.
 * Returns the Bolna call object including call_id.
 */
export async function initiateCall(
  payload: InitiateCallPayload,
  org?: OrgBolnaCredentials
): Promise<BolnaCallResponse> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.post<BolnaCallResponse>('/call', {
    agent_id: payload.agent_id,
    recipient_phone_number: payload.recipient_phone_number,
    from_phone_number: payload.from_phone_number,
    user_data: payload.user_data ?? {},
  });
  return res.data;
}

/**
 * Fetch call details from Bolna by call_id.
 */
export async function getCallDetails(
  callId: string,
  org?: OrgBolnaCredentials
): Promise<Record<string, unknown>> {
  const client = org ? getOrgClient(org) : bolnaClient;
  const res = await client.get(`/call/${callId}`);
  return res.data?.data ?? res.data;
}
