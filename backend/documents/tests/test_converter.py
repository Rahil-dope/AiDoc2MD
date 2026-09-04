import os
import tempfile
import pytest
from PIL import Image
from documents.services.converter import DocumentConverter


def test_converter_text_file():
    converter = DocumentConverter()
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write("# Hello AiDoc2MD\nThis is a sample document for testing AnyDoc conversion engine.")
        temp_path = f.name

    try:
        result = converter.convert(temp_path, "txt")
        assert result.error is None
        assert "Hello AiDoc2MD" in result.raw_markdown
        assert "Hello AiDoc2MD" in result.raw_extracted_text
        assert "anydoc" in result.metadata.get("engine", "")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_converter_csv_file():
    converter = DocumentConverter()
    with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8') as f:
        f.write("Name,Role,Score\nAlice,Developer,95\nBob,Designer,90\n")
        temp_path = f.name

    try:
        result = converter.convert(temp_path, "csv")
        assert result.error is None
        assert "Alice" in result.raw_markdown
        assert "Bob" in result.raw_markdown
        assert result.metadata.get("engine") == "anydoc"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_converter_unsupported_image_routing():
    converter = DocumentConverter()
    with tempfile.NamedTemporaryFile('wb', suffix='.png', delete=False) as f:
        temp_path = f.name
        img = Image.new('RGB', (100, 100), color=(73, 109, 137))
        img.save(temp_path, 'PNG')

    try:
        result = converter.convert(temp_path, "png")
        assert result.error is None
        assert "Image Metadata" in result.raw_markdown or "Vision Analysis" in result.raw_markdown or "Dimensions" in result.raw_markdown
        assert result.metadata.get("engine") == "pillow_vision"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


