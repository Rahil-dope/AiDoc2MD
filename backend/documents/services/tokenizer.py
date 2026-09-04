import re
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class TokenMetrics:
    raw_tokens: int
    markdown_tokens: int
    cleaned_tokens: int
    saved_tokens: int
    token_reduction_pct: float
    readiness_score: float
    metrics_breakdown: Dict[str, Any] = field(default_factory=dict)


class TokenizerAnalyzer:
    """
    Tokenizer and AI Readiness Analyzer.
    Uses tiktoken cl100k_base / o200k_base for precise token accounting and calculates
    comprehensive AI readiness scores.
    """

    def __init__(self, encoding_name: str = "cl100k_base"):
        self.encoding_name = encoding_name
        self._encoder = None

    @property
    def encoder(self):
        if self._encoder is None:
            try:
                import tiktoken
                try:
                    self._encoder = tiktoken.get_encoding(self.encoding_name)
                except Exception:
                    self._encoder = tiktoken.get_encoding("cl100k_base")
            except Exception as e:
                logger.warning(f"tiktoken encoding load failed: {e}. Falling back to heuristic estimation.")
                self._encoder = None
        return self._encoder

    def count_tokens(self, text: Optional[str]) -> int:
        """Count exact tokens using tiktoken, or fallback to word-ratio estimation."""
        if not text:
            return 0
        if self.encoder:
            try:
                return len(self.encoder.encode(text))
            except Exception as e:
                logger.debug(f"Error encoding text with tiktoken: {e}")

        # Heuristic fallback: ~4 characters per token for English text
        words = len(text.split())
        chars = len(text)
        return int(max(words * 1.3, chars / 4))

    def analyze(
        self,
        raw_text: str,
        raw_markdown: str,
        cleaned_markdown: str
    ) -> TokenMetrics:
        """Calculate complete token efficiency metrics and AI readiness score."""
        raw_tokens = self.count_tokens(raw_text or raw_markdown)
        md_tokens = self.count_tokens(raw_markdown)
        cleaned_tokens = self.count_tokens(cleaned_markdown)

        # In case cleaned markdown is empty, use raw markdown
        if cleaned_tokens == 0 and md_tokens > 0:
            cleaned_tokens = md_tokens

        # If raw tokens is lower than md tokens due to formatting, ensure baseline
        baseline_tokens = max(raw_tokens, md_tokens)
        saved_tokens = max(0, baseline_tokens - cleaned_tokens)
        
        if baseline_tokens > 0:
            reduction_pct = round((saved_tokens / baseline_tokens) * 100, 1)
        else:
            reduction_pct = 0.0

        # Calculate 4-Pillar AI Readiness Score
        breakdown = self.calculate_readiness_score(cleaned_markdown or raw_markdown)

        # Calculate Cost & Context Window metrics
        context_usage = {
            "window_8k_pct": round((cleaned_tokens / 8192) * 100, 2),
            "window_32k_pct": round((cleaned_tokens / 32768) * 100, 2),
            "window_128k_pct": round((cleaned_tokens / 131072) * 100, 2),
            "window_1m_pct": round((cleaned_tokens / 1000000) * 100, 3),
        }

        # Projected cost savings per 10k query injections (GPT-4o: $2.50/M tokens, Claude 3.5 Sonnet: $3.00/M)
        gpt4o_savings = round((saved_tokens * 10000 / 1000000) * 2.50, 2)
        claude_savings = round((saved_tokens * 10000 / 1000000) * 3.00, 2)

        breakdown["context_usage"] = context_usage
        breakdown["cost_savings"] = {
            "saved_tokens_per_call": saved_tokens,
            "gpt4o_savings_10k_calls_usd": gpt4o_savings,
            "claude_savings_10k_calls_usd": claude_savings,
        }

        return TokenMetrics(
            raw_tokens=baseline_tokens,
            markdown_tokens=md_tokens,
            cleaned_tokens=cleaned_tokens,
            saved_tokens=saved_tokens,
            token_reduction_pct=reduction_pct,
            readiness_score=breakdown["total_score"],
            metrics_breakdown=breakdown
        )

    def calculate_readiness_score(self, markdown_text: str) -> Dict[str, Any]:
        """
        Evaluate Markdown quality for LLM consumption across 4 dimensions (0-100 total):
        1. Structure Score (30 pts)
        2. Cleanliness Score (30 pts)
        3. Token Density Score (25 pts)
        4. Semantic Clarity Score (15 pts)
        """
        if not markdown_text or not markdown_text.strip():
            return {
                "total_score": 0.0,
                "tier": "Empty",
                "structure_score": 0.0,
                "cleanliness_score": 0.0,
                "token_density_score": 0.0,
                "semantic_clarity_score": 0.0,
                "insights": ["Document contains no text."]
            }

        lines = markdown_text.split('\n')
        total_lines = len(lines)
        insights = []

        # --- 1. Structure Score (Max 30) ---
        structure_score = 0.0
        # Check headings
        h1_count = len(re.findall(r'^#\s+', markdown_text, re.MULTILINE))
        h2_count = len(re.findall(r'^##\s+', markdown_text, re.MULTILINE))
        h3_count = len(re.findall(r'^###\s+', markdown_text, re.MULTILINE))

        if h1_count >= 1:
            structure_score += 10.0
            insights.append("Clear primary document title (H1) detected")
        if h2_count >= 1:
            structure_score += 8.0
            insights.append(f"Organized into {h2_count} distinct sections (H2)")
        if h3_count >= 1:
            structure_score += 4.0

        # Check tables
        tables = re.findall(r'\|.*\|.*\n\|[-:\s|]+\|\n(?:\|.*\|\n?)*', markdown_text)
        if tables:
            structure_score += 5.0
            insights.append(f"Contains {len(tables)} formatted Markdown table(s)")
        else:
            structure_score += 2.0  # not all documents need tables

        # Check lists and code blocks
        has_lists = bool(re.search(r'^\s*[-*]\s+', markdown_text, re.MULTILINE))
        has_code = '```' in markdown_text
        if has_lists:
            structure_score += 2.0
        if has_code:
            structure_score += 1.0

        structure_score = min(30.0, round(structure_score, 1))

        # --- 2. Cleanliness Score (Max 30) ---
        cleanliness_score = 30.0
        # Check for page numbers / pagination noise
        page_noise = len(re.findall(r'(?i)\bPage\s+\d+\b', markdown_text))
        if page_noise > 0:
            cleanliness_score -= min(8.0, page_noise * 2.0)
            insights.append(f"Found {page_noise} raw page numbering artifacts")

        # Check for excessive blank lines (runs of > 2 empty lines)
        excessive_blanks = len(re.findall(r'\n{4,}', markdown_text))
        if excessive_blanks > 0:
            cleanliness_score -= min(5.0, excessive_blanks * 1.5)

        # Check for non-standard characters / control chars
        control_chars = len(re.findall(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', markdown_text))
        if control_chars > 0:
            cleanliness_score -= min(10.0, control_chars * 2.0)
            insights.append(f"Detected {control_chars} unescaped control characters")

        # Check for broken table pipes (lines with odd number of unescaped pipes)
        odd_pipes = 0
        for line in lines:
            if '|' in line and not (line.strip().startswith('|') and line.strip().endswith('|')):
                odd_pipes += 1
        if odd_pipes > 2:
            cleanliness_score -= min(5.0, odd_pipes * 1.0)

        cleanliness_score = max(0.0, min(30.0, round(cleanliness_score, 1)))

        # --- 3. Token Density Score (Max 25) ---
        # High ratio of alphanumeric characters to special symbols indicates rich information
        char_count = len(markdown_text)
        alphanumeric_count = len(re.findall(r'[a-zA-Z0-9]', markdown_text))
        density_ratio = (alphanumeric_count / char_count) if char_count > 0 else 0

        # Ideal density is between 0.70 and 0.85
        if density_ratio >= 0.75:
            token_density_score = 25.0
            insights.append("High information density (optimal context-to-noise ratio)")
        elif density_ratio >= 0.60:
            token_density_score = 20.0
        elif density_ratio >= 0.40:
            token_density_score = 15.0
        else:
            token_density_score = 10.0
            insights.append("Low information density — heavy formatting or sparse layout")

        token_density_score = round(token_density_score, 1)

        # --- 4. Semantic Clarity Score (Max 15) ---
        semantic_score = 15.0
        # Average line length (penalty if most lines are < 15 chars e.g. broken line-wraps)
        non_empty_lines = [l for l in lines if l.strip()]
        if non_empty_lines:
            avg_line_len = sum(len(l) for l in non_empty_lines) / len(non_empty_lines)
            if avg_line_len < 20:
                semantic_score -= 5.0
                insights.append("Fragmented line wraps detected")
            elif avg_line_len > 300:
                semantic_score -= 2.0  # long unformatted walls of text

        # Check for balanced code blocks
        if markdown_text.count('```') % 2 != 0:
            semantic_score -= 5.0
            insights.append("Unclosed code block detected")

        semantic_score = max(0.0, min(15.0, round(semantic_score, 1)))

        # Total Calculation
        total_score = round(structure_score + cleanliness_score + token_density_score + semantic_score, 1)

        if total_score >= 90:
            tier = "Production Ready"
        elif total_score >= 75:
            tier = "Optimal Context"
        elif total_score >= 60:
            tier = "Acceptable"
        else:
            tier = "Needs Normalization"

        return {
            "total_score": total_score,
            "tier": tier,
            "structure_score": structure_score,
            "cleanliness_score": cleanliness_score,
            "token_density_score": token_density_score,
            "semantic_clarity_score": semantic_score,
            "insights": insights[:5]
        }
