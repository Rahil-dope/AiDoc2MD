export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface MetricsBreakdown {
  total_score: number;
  tier: string;
  structure_score: number;
  cleanliness_score: number;
  token_density_score: number;
  semantic_clarity_score: number;
  insights?: string[];
  context_usage?: {
    window_8k_pct: number;
    window_32k_pct: number;
    window_128k_pct: number;
    window_1m_pct: number;
  };
  cost_savings?: {
    saved_tokens_per_call: number;
    gpt4o_savings_10k_calls_usd: number;
    claude_savings_10k_calls_usd: number;
  };
}

export interface DocumentSummary {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  processing_stage: string;
  raw_tokens: number;
  cleaned_tokens: number;
  saved_tokens: number;
  token_reduction_pct: number;
  ai_readiness_score: number;
  ai_provider_used?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  file_url?: string | null;
  error_message?: string | null;
  raw_extracted_text?: string | null;
  raw_markdown?: string | null;
  cleaned_markdown?: string | null;
  user_edited_markdown?: string | null;
  current_markdown: string;
  markdown_tokens: number;
  metrics_breakdown: MetricsBreakdown;
  custom_ai_instructions?: string | null;
}

export type ViewMode = 'split' | 'editor' | 'preview' | 'diff';

export interface ReprocessOptions {
  custom_ai_instructions?: string;
  preferred_provider?: 'auto' | 'openai' | 'gemini' | 'heuristic';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
