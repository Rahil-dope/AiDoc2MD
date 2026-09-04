import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aidoc2md.settings')
django.setup()

from documents.services.converter import DocumentConverter
from documents.services.ai_cleaner import AICleaner
from documents.services.tokenizer import TokenizerAnalyzer
from documents.services.exporter import DocumentExporter

def run_verification():
    print("--- 1. Testing Document Converter with Sample Markdown & CSV ---")
    converter = DocumentConverter()
    
    # Test CSV
    sample_csv_path = "sample_test.csv"
    with open(sample_csv_path, "w", encoding="utf-8") as f:
        f.write("Model,Context_Window,Input_Price_Per_M,Output_Price_Per_M\nGPT-4o,128000,2.50,10.00\nClaude-3.5-Sonnet,200000,3.00,15.00\nGemini-1.5-Flash,1000000,0.075,0.30\n")
    
    csv_res = converter.convert(sample_csv_path, "csv")
    print(f"CSV Conversion Engine: {csv_res.metadata.get('engine')}")
    print(f"CSV Markdown output preview:\n{csv_res.raw_markdown[:150]}...\n")
    
    print("--- 2. Testing AI Normalizer ---")
    cleaner = AICleaner()
    messy_text = """Page 1 of 3
    
BENCHMARK RESULTS: ENTERPRISE CONTEXT
    
Here are OCR ligatures: ﬁnancial and ﬂexibility.
* Item A
* Item B

| Metric | Value |
| Accuracy | 99.4% |
| Latency | 45ms |

Page 2 of 3
"""
    clean_res = cleaner.clean(messy_text)
    print(f"Provider: {clean_res.provider_used}")
    print(f"Improvements ({len(clean_res.improvements_made)}): {clean_res.improvements_made}")
    print(f"Cleaned snippet:\n{clean_res.cleaned_markdown[:160]}...\n")
    
    print("--- 3. Testing Tiktoken Tokenizer & 4-Pillar AI Readiness Score ---")
    tokenizer = TokenizerAnalyzer()
    metrics = tokenizer.analyze(messy_text, messy_text, clean_res.cleaned_markdown)
    print(f"Raw Tokens: {metrics.raw_tokens}")
    print(f"Cleaned Tokens: {metrics.cleaned_tokens}")
    print(f"Tokens Saved: {metrics.saved_tokens} ({metrics.token_reduction_pct}%)")
    print(f"AI Readiness Score: {metrics.readiness_score}/100 (Tier: {metrics.metrics_breakdown.get('tier')})")
    print(f"Breakdown: Structure={metrics.metrics_breakdown.get('structure_score')}/30, Cleanliness={metrics.metrics_breakdown.get('cleanliness_score')}/30, Density={metrics.metrics_breakdown.get('token_density_score')}/25, Clarity={metrics.metrics_breakdown.get('semantic_clarity_score')}/15")
    
    print("\n--- 4. Testing PDF Generation ---")
    pdf_bytes = DocumentExporter.markdown_to_pdf_bytes(clean_res.cleaned_markdown, "AiDoc2MD Verification Report")
    print(f"Generated PDF bytes: {len(pdf_bytes)} bytes")
    
    # Cleanup
    if os.path.exists(sample_csv_path):
        os.remove(sample_csv_path)
    
    print("\n[SUCCESS] All End-to-End Verification Steps Succeeded!")

if __name__ == "__main__":
    run_verification()
