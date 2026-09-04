import pytest
from documents.services.tokenizer import TokenizerAnalyzer


def test_token_counting():
    analyzer = TokenizerAnalyzer()
    text = "Hello world! This is ContextForge testing token counts."
    count = analyzer.count_tokens(text)
    assert count > 0
    assert isinstance(count, int)


def test_token_analysis_metrics():
    analyzer = TokenizerAnalyzer()
    raw_text = "Page 1 of 10\n\nIntroduction\n\n\n\nSome text with messy spacing   and weird ligatures ﬁ and ﬂ."
    raw_md = "# Introduction\n\nSome text with messy spacing and ligatures."
    cleaned_md = "# Introduction\n\nSome text with clean spacing and ligatures."

    metrics = analyzer.analyze(raw_text, raw_md, cleaned_md)
    assert metrics.raw_tokens > 0
    assert metrics.cleaned_tokens > 0
    assert 0 <= metrics.readiness_score <= 100
    assert "total_score" in metrics.metrics_breakdown
    assert "context_usage" in metrics.metrics_breakdown


def test_readiness_score_pillars():
    analyzer = TokenizerAnalyzer()
    good_markdown = """# ContextForge System Architecture

## 1. Overview
ContextForge provides high-performance document normalization and token reduction.

| Component | Technology | Role |
| --- | --- | --- |
| Backend | Django DRF | API Layer |
| Async | Celery & Redis | Task Engine |
| Tokenizer | Tiktoken | Exact Accounting |

```python
def example():
    return "Optimized"
```
"""
    breakdown = analyzer.calculate_readiness_score(good_markdown)
    assert breakdown["total_score"] >= 70
    assert breakdown["structure_score"] > 15
    assert breakdown["cleanliness_score"] > 20
    assert breakdown["tier"] in ["Optimal Context", "Production Ready"]
