import pytest
from documents.services.exporter import DocumentExporter


def test_markdown_to_pdf_basic():
    md_content = """# Main Document Title

This is a paragraph with **bold text**, *italic text*, and `inline code`.

## Section 1: Features
- First bullet item
- Second bullet item with [Link](https://example.com)
- Third bullet item

### Subsection 1.1: Steps
1. First numbered step
2. Second numbered step
3. Third numbered step
"""
    pdf_bytes = DocumentExporter.markdown_to_pdf_bytes(md_content, title="Test Report")
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b'%PDF-')


def test_markdown_to_pdf_tables_and_blocks():
    md_content = """# Complex Document with Tables & Code

> This is an important blockquote summarizing the key findings of the document.

---

### Data Summary Table

| Metric | Raw Count | Cleaned Count | Savings (%) |
| :--- | :--- | :--- | :--- |
| Word Tokens | 14,200 | 9,850 | 30.6% |
| Characters | 85,400 | 62,100 | 27.3% |
| Tables Processed | 12 | 12 | 0.0% |

### Sample Python Code Block

```python
def process_markdown(text: str) -> str:
    # Remove boilerplate headers and noise
    return text.strip()
```

#### Final Thoughts
Document normalization successfully converted all noisy elements into clean context.
"""
    pdf_bytes = DocumentExporter.markdown_to_pdf_bytes(md_content, title="Data Analysis Report")
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b'%PDF-')


def test_markdown_to_pdf_xml_escaping():
    md_content = """# Escape Test
This paragraph contains <special> & "characters" that need &amp; escaping.
`code with <brackets> & symbols`
"""
    pdf_bytes = DocumentExporter.markdown_to_pdf_bytes(md_content, title="Escape Test")
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b'%PDF-')
