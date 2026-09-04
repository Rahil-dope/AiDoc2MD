import pytest
from documents.services.ai_cleaner import AICleaner, HeuristicRuleCleaner


def test_heuristic_cleaning():
    cleaner = HeuristicRuleCleaner()
    messy_md = """Page 1 of 5
    
CHAPTER ONE: INTRODUCTION

Here is some text with ligature issues: ﬁnancial and ﬂow.
* Item 1
o Item 2
+ Item 3

| Name | Role |
| Alice | Admin |
| Bob | User |

Page 2 of 5
"""
    cleaned, improvements = cleaner.clean(messy_md)
    assert "Page 1 of 5" not in cleaned
    assert "Page 2 of 5" not in cleaned
    assert "financial" in cleaned
    assert "flow" in cleaned
    assert "## Chapter One: Introduction" in cleaned
    assert "- Item 1" in cleaned
    assert "| --- | --- |" in cleaned  # Table separator inserted


def test_ai_cleaner_fallback():
    cleaner = AICleaner()
    raw = "# Sample Document\n\nSome test markdown with standard text."
    result = cleaner.clean(raw, preferred_provider="heuristic")
    assert result.cleaned_markdown != ""
    assert result.provider_used != ""
    assert isinstance(result.improvements_made, list)
