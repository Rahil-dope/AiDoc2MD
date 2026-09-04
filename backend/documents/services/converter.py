import os
import logging
import re
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class ConversionResult:
    raw_extracted_text: str
    raw_markdown: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class DocumentConverter:
    """
    Authoritative Document-to-Markdown Converter Adapter powered by AnyDoc.
    Converts Word (DOC, DOCX), PowerPoint (PPT, PPTX), Excel (XLS, XLSX),
    PDF, CSV, EPUB, RTF, OpenDocument (ODT, ODS, ODP), and Plain Text.
    """

    def __init__(self):
        self._anydoc = None

    @property
    def anydoc(self):
        if self._anydoc is None:
            try:
                import anydoc
                self._anydoc = anydoc
            except ImportError:
                logger.error("firecrawl-anydoc is not installed. Please install firecrawl-anydoc.")
                self._anydoc = None
        return self._anydoc

    def convert(self, file_path: str, file_type: Optional[str] = None) -> ConversionResult:
        """
        Convert document using AnyDoc as the primary and authoritative conversion engine.
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

        if not self.anydoc:
            return ConversionResult(
                raw_extracted_text="",
                raw_markdown="",
                error="AnyDoc engine is not available in the environment."
            )

        # 1. Check for Image formats (PNG, JPG, JPEG, WEBP, BMP, TIFF)
        # AnyDoc focuses on document formats; route raw images to the Vision/Image pipeline.
        if file_type in ('png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif'):
            return self._convert_image_pipeline(file_path, file_type)

        # 2. Check for Plain Text / Markdown formats (TXT, MD, LOG)
        if file_type in ('txt', 'text', 'md', 'markdown', 'log'):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                return ConversionResult(
                    raw_extracted_text=self._strip_markdown_syntax(content),
                    raw_markdown=content,
                    metadata={"engine": "anydoc_text", "format": file_type}
                )
            except Exception as e:
                return ConversionResult(
                    raw_extracted_text="",
                    raw_markdown="",
                    error=f"Failed to read text file: {e}"
                )

        # 3. Invoke AnyDoc conversion for all Document, Spreadsheet, Presentation, PDF, EPUB, RTF formats
        try:
            firecrawl_key = getattr(settings, 'FIRECRAWL_API_KEY', os.getenv('FIRECRAWL_API_KEY', None))
            firecrawl_url = getattr(settings, 'FIRECRAWL_API_URL', os.getenv('FIRECRAWL_API_URL', None))
            ocr_mode = "hosted" if firecrawl_key else "reject"

            # Primary: Convert via AnyDoc
            try:
                markdown_output = self.anydoc.to_markdown(
                    file_path,
                    ocr=ocr_mode,
                    api_key=firecrawl_key,
                    api_url=firecrawl_url
                )
            except self.anydoc.NeedsOcrError as ocr_err:
                # If scanned PDF and no API key, attempt hosted fallback or report clean OCR notice
                try:
                    markdown_output = self.anydoc.to_markdown(
                        file_path,
                        ocr="hosted",
                        api_key=firecrawl_key,
                        api_url=firecrawl_url
                    )
                except Exception as hosted_err:
                    logger.warning(f"AnyDoc NeedsOcrError for {file_path}: {ocr_err}. Hosted fallback: {hosted_err}")
                    return ConversionResult(
                        raw_extracted_text="",
                        raw_markdown="",
                        error=f"Scanned document requires OCR: {str(ocr_err)}. Please configure FIRECRAWL_API_KEY for hosted OCR."
                    )
            except self.anydoc.EncryptedError:
                return ConversionResult(
                    raw_extracted_text="",
                    raw_markdown="",
                    error="This document is password protected or encrypted and cannot be converted."
                )
            except self.anydoc.UnsupportedError as unsupp_err:
                logger.warning(f"AnyDoc UnsupportedError for {file_path}: {unsupp_err}")
                return ConversionResult(
                    raw_extracted_text="",
                    raw_markdown="",
                    error=f"Unsupported format: {str(unsupp_err)}"
                )

            if markdown_output is not None and markdown_output.strip():
                clean_md = markdown_output.strip()
                raw_text = self._strip_markdown_syntax(clean_md)
                return ConversionResult(
                    raw_extracted_text=raw_text,
                    raw_markdown=clean_md,
                    metadata={
                        "engine": "anydoc",
                        "format": file_type,
                        "version": getattr(self.anydoc, '__version__', '0.2.4')
                    }
                )
            else:
                return ConversionResult(
                    raw_extracted_text="",
                    raw_markdown=f"# {os.path.splitext(os.path.basename(file_path))[0]}\n\n(Empty document content)",
                    metadata={"engine": "anydoc", "format": file_type}
                )

        except Exception as e:
            logger.error(f"AnyDoc conversion failed for {file_path}: {e}", exc_info=True)
            return ConversionResult(
                raw_extracted_text="",
                raw_markdown="",
                error=f"AnyDoc conversion failed: {str(e)}"
            )

    def _convert_image_pipeline(self, file_path: str, file_type: str) -> ConversionResult:
        """
        Vision / Image pipeline for image files not processed directly by document parsers.
        """
        try:
            from PIL import Image
            img = Image.open(file_path)
            width, height = img.size
            img_format = img.format or file_type.upper()
            mode = img.mode
            filename = os.path.basename(file_path)
            title = os.path.splitext(filename)[0]

            raw_text = f"Image Document: {title}\nFormat: {img_format}\nResolution: {width}x{height}\nColor Mode: {mode}"
            raw_markdown = f"# {title}\n\n![{filename}]({filename})\n\n**Image Metadata:**\n- **Format**: {img_format}\n- **Resolution**: {width} × {height} px\n- **Color Mode**: {mode}\n"

            return ConversionResult(
                raw_extracted_text=raw_text,
                raw_markdown=raw_markdown,
                metadata={"engine": "pillow_vision", "width": width, "height": height, "format": img_format}
            )
        except Exception as e:
            logger.warning(f"Image pipeline failed for {file_path}: {e}")
            return ConversionResult(
                raw_extracted_text="",
                raw_markdown="",
                error=f"Failed to process image: {str(e)}"
            )

    def _strip_markdown_syntax(self, md_text: str) -> str:
        """Helper to create plain text representation from structured markdown."""
        text = re.sub(r'#+\s*', '', md_text)
        text = re.sub(r'[*_~`]', '', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = re.sub(r'\|', ' ', text)
        text = re.sub(r'---+', '', text)
        return re.sub(r'\n{3,}', '\n\n', text).strip()
