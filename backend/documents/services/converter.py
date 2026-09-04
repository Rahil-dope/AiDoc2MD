import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class ConversionResult:
    raw_extracted_text: str
    raw_markdown: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class DocumentConverter:
    """
    Robust Multi-Format Document-to-Markdown Converter.
    Uses Microsoft MarkItDown as the primary converter with dedicated fallback parsers
    for PDF, DOCX, XLSX, PPTX, CSV, HTML, and Images.
    """

    def __init__(self):
        self._markitdown_instance = None

    @property
    def markitdown(self):
        if self._markitdown_instance is None:
            try:
                from markitdown import MarkItDown
                self._markitdown_instance = MarkItDown()
            except ImportError:
                logger.warning("markitdown library not installed, will rely on native fallback parsers.")
                self._markitdown_instance = None
            except Exception as e:
                logger.warning(f"Failed to initialize MarkItDown: {e}")
                self._markitdown_instance = None
        return self._markitdown_instance

    def convert(self, file_path: str, file_type: Optional[str] = None) -> ConversionResult:
        """
        Convert any supported file into Markdown and plain raw text.
        """
        if not os.path.exists(file_path):
            return ConversionResult(
                raw_extracted_text="",
                raw_markdown="",
                error=f"File not found at path: {file_path}"
            )

        if not file_type:
            ext = os.path.splitext(file_path)[1].lower().lstrip('.')
            file_type = ext or 'txt'
        else:
            file_type = file_type.lower().lstrip('.')

        # 1. Try Microsoft MarkItDown first
        if self.markitdown:
            try:
                result = self.markitdown.convert(file_path)
                markdown_content = result.text_content if hasattr(result, 'text_content') else str(result)
                stripped_md = markdown_content.strip() if markdown_content else ""
                if stripped_md and not stripped_md.startswith('%PDF-') and not ('1 0 obj' in stripped_md[:200] and '/Type' in stripped_md[:300]):
                    raw_text = self._strip_markdown_syntax(stripped_md)
                    return ConversionResult(
                        raw_extracted_text=raw_text,
                        raw_markdown=stripped_md,
                        metadata={"engine": "markitdown", "file_type": file_type}
                    )
                else:
                    logger.warning(f"MarkItDown output contained raw PDF binary stream for {file_path}. Falling back to pypdf.")
            except Exception as e:
                logger.warning(f"MarkItDown conversion failed for {file_path} ({file_type}): {e}. Trying fallback.")

        # 2. Specialized Fallback Handlers
        try:
            if file_type == 'pdf':
                return self._convert_pdf_fallback(file_path)
            elif file_type in ('docx', 'doc'):
                return self._convert_docx_fallback(file_path)
            elif file_type in ('xlsx', 'xls'):
                return self._convert_excel_fallback(file_path)
            elif file_type == 'csv':
                return self._convert_csv_fallback(file_path)
            elif file_type in ('pptx', 'ppt'):
                return self._convert_pptx_fallback(file_path)
            elif file_type in ('html', 'htm'):
                return self._convert_html_fallback(file_path)
            elif file_type in ('jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'):
                return self._convert_image_fallback(file_path)
            elif file_type in ('txt', 'md', 'json', 'log', 'yaml', 'yml'):
                return self._convert_text_fallback(file_path)
            else:
                # Default generic text fallback
                return self._convert_text_fallback(file_path)
        except Exception as e:
            logger.error(f"Fallback converter failed for {file_path}: {e}", exc_info=True)
            return ConversionResult(
                raw_extracted_text="",
                raw_markdown="",
                error=f"Failed to convert document: {str(e)}"
            )

    def _convert_pdf_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for PDF using pypdf."""
        import pypdf
        reader = pypdf.PdfReader(file_path)
        pages_text = []
        md_pages = []

        num_pages = len(reader.pages)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_text.append(text)
            if text.strip():
                md_pages.append(f"## Page {idx + 1}\n\n{text.strip()}")

        raw_text = "\n\n".join(pages_text)
        raw_markdown = "\n\n---\n\n".join(md_pages) if md_pages else raw_text

        return ConversionResult(
            raw_extracted_text=raw_text,
            raw_markdown=raw_markdown,
            metadata={"engine": "pypdf_fallback", "pages": num_pages}
        )

    def _convert_docx_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for DOCX using python-docx."""
        import docx
        doc = docx.Document(file_path)
        raw_paragraphs = []
        md_elements = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            raw_paragraphs.append(text)
            style_name = p.style.name.lower() if p.style else ""
            if 'heading 1' in style_name:
                md_elements.append(f"# {text}")
            elif 'heading 2' in style_name:
                md_elements.append(f"## {text}")
            elif 'heading 3' in style_name:
                md_elements.append(f"### {text}")
            elif 'list' in style_name or 'bullet' in style_name:
                md_elements.append(f"- {text}")
            else:
                md_elements.append(text)

        # Extract tables
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                cells = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
                table_rows.append(cells)
            if table_rows:
                header = table_rows[0]
                sep = ["---"] * len(header)
                md_table = [
                    "| " + " | ".join(header) + " |",
                    "| " + " | ".join(sep) + " |"
                ]
                for r in table_rows[1:]:
                    md_table.append("| " + " | ".join(r) + " |")
                md_elements.append("\n".join(md_table))

        return ConversionResult(
            raw_extracted_text="\n\n".join(raw_paragraphs),
            raw_markdown="\n\n".join(md_elements),
            metadata={"engine": "docx_fallback", "paragraphs": len(raw_paragraphs), "tables": len(doc.tables)}
        )

    def _convert_excel_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for Excel using openpyxl & pandas."""
        import pandas as pd
        excel_file = pd.ExcelFile(file_path)
        md_sections = []
        raw_text_parts = []

        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            df = df.dropna(how='all')
            if df.empty:
                continue
            raw_text_parts.append(f"Sheet: {sheet_name}\n" + df.to_string())
            md_table = df.to_markdown(index=False)
            md_sections.append(f"### Sheet: {sheet_name}\n\n{md_table}")

        return ConversionResult(
            raw_extracted_text="\n\n".join(raw_text_parts),
            raw_markdown="\n\n".join(md_sections),
            metadata={"engine": "pandas_excel", "sheets": len(excel_file.sheet_names)}
        )

    def _convert_csv_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for CSV files."""
        import pandas as pd
        try:
            df = pd.read_csv(file_path)
            md_table = df.to_markdown(index=False)
            raw_text = df.to_string()
            return ConversionResult(
                raw_extracted_text=raw_text,
                raw_markdown=f"### CSV Data ({len(df)} rows)\n\n{md_table}",
                metadata={"engine": "pandas_csv", "rows": len(df), "columns": len(df.columns)}
            )
        except Exception:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            return ConversionResult(
                raw_extracted_text=content,
                raw_markdown=f"```csv\n{content}\n```",
                metadata={"engine": "raw_csv"}
            )

    def _convert_pptx_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for PowerPoint presentations."""
        try:
            from pptx import Presentation
            prs = Presentation(file_path)
            md_slides = []
            raw_text = []

            for idx, slide in enumerate(prs.slides):
                slide_lines = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            text = paragraph.text.strip()
                            if text:
                                slide_lines.append(text)
                if slide_lines:
                    raw_text.append(f"Slide {idx + 1}:\n" + "\n".join(slide_lines))
                    title = slide_lines[0] if slide_lines else f"Slide {idx + 1}"
                    body = "\n\n".join(slide_lines[1:]) if len(slide_lines) > 1 else ""
                    md_slides.append(f"## {title}\n\n{body}")

            return ConversionResult(
                raw_extracted_text="\n\n".join(raw_text),
                raw_markdown="\n\n---\n\n".join(md_slides),
                metadata={"engine": "pptx_fallback", "slides": len(prs.slides)}
            )
        except Exception as e:
            logger.warning(f"PPTX fallback error: {e}")
            return self._convert_text_fallback(file_path)

    def _convert_html_fallback(self, file_path: str) -> ConversionResult:
        """Fallback converter for HTML using BeautifulSoup."""
        from bs4 import BeautifulSoup
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            html = f.read()

        soup = BeautifulSoup(html, 'html.parser')
        # Remove scripts and styles
        for script in soup(["script", "style", "nav", "footer"]):
            script.extract()

        raw_text = soup.get_text(separator='\n')
        # Simple HTML tag conversion
        md_elements = []
        for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'table', 'pre']):
            text = tag.get_text().strip()
            if not text:
                continue
            if tag.name == 'h1':
                md_elements.append(f"# {text}")
            elif tag.name == 'h2':
                md_elements.append(f"## {text}")
            elif tag.name == 'h3':
                md_elements.append(f"### {text}")
            elif tag.name in ('ul', 'ol'):
                for li in tag.find_all('li'):
                    md_elements.append(f"- {li.get_text().strip()}")
            elif tag.name == 'pre':
                md_elements.append(f"```\n{text}\n```")
            else:
                md_elements.append(text)

        raw_markdown = "\n\n".join(md_elements) if md_elements else raw_text
        return ConversionResult(
            raw_extracted_text=raw_text,
            raw_markdown=raw_markdown,
            metadata={"engine": "bs4_html"}
        )

    def _convert_image_fallback(self, file_path: str) -> ConversionResult:
        """Fallback handler for images."""
        from PIL import Image
        img = Image.open(file_path)
        width, height = img.size
        img_format = img.format or 'Unknown'
        mode = img.mode

        metadata_text = f"Image Metadata:\nFormat: {img_format}\nDimensions: {width}x{height}\nColor Mode: {mode}"
        raw_markdown = f"# Image Document\n\n![Uploaded Image]({os.path.basename(file_path)})\n\n**Image Information:**\n- **Format**: {img_format}\n- **Resolution**: {width} × {height} px\n- **Color Mode**: {mode}\n"

        return ConversionResult(
            raw_extracted_text=metadata_text,
            raw_markdown=raw_markdown,
            metadata={"engine": "pillow", "width": width, "height": height, "format": img_format}
        )

    def _convert_text_fallback(self, file_path: str) -> ConversionResult:
        """Direct text / markdown read."""
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        return ConversionResult(
            raw_extracted_text=content,
            raw_markdown=content,
            metadata={"engine": "utf8_text", "length": len(content)}
        )

    def _strip_markdown_syntax(self, md_text: str) -> str:
        """Helper to create plain text from markdown."""
        import re
        text = re.sub(r'#+\s*', '', md_text)
        text = re.sub(r'[*_~`]', '', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = re.sub(r'\|', ' ', text)
        text = re.sub(r'---+', '', text)
        return re.sub(r'\n{3,}', '\n\n', text).strip()
