export interface TokenOptions {
  agentId: string;
  capabilities?: string[];
  expiresIn?: number;
  workspaceId?: string;
  userId?: string;
}

export interface AuthToken {
  id: string;
  agentId: string;
  capabilities: string[];
  issuedAt: number;
  expiresAt: number;
  signature: string;
} 