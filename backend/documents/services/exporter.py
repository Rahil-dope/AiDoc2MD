import io
import re
import logging
from typing import Tuple
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors

logger = logging.getLogger(__name__)


class DocumentExporter:
    """
    Exports Markdown documents to formatted PDF and clean Markdown bundles.
    """

    @staticmethod
    def markdown_to_pdf_bytes(markdown_text: str, title: str = "Document") -> bytes:
        """
        Convert Markdown text to a polished PDF document buffer using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()

        # Custom Luxury PDF Typography Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=12
        )

        h1_style = ParagraphStyle(
            'CustomH1',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=14,
            spaceAfter=8
        )

        h2_style = ParagraphStyle(
            'CustomH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#334155'),
            spaceBefore=10,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )

        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            leftIndent=15,
            spaceAfter=3
        )

        code_style = ParagraphStyle(
            'CustomCode',
            parent=styles['Code'],
            fontName='Courier',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#0f172a'),
            backColor=colors.HexColor('#f1f5f9'),
            borderColor=colors.HexColor('#e2e8f0'),
            borderWidth=1,
            borderPadding=6,
            spaceBefore=6,
            spaceAfter=6
        )

        story = []

        # Add Header banner
        story.append(Paragraph(f"<b>ContextForge</b> Export — {title}", ParagraphStyle('Sub', fontSize=8, textColor=colors.HexColor('#64748b'))))
        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=14))

        # Parse markdown lines
        lines = markdown_text.split('\n')
        in_code_block = False
        code_buffer = []

        for line in lines:
            stripped = line.strip()

            if stripped.startswith('```'):
                if in_code_block:
                    # End code block
                    code_text = "<br/>".join(code_buffer)
                    story.append(Paragraph(code_text, code_style))
                    story.append(Spacer(1, 6))
                    code_buffer = []
                    in_code_block = False
                else:
                    in_code_block = True
                continue

            if in_code_block:
                escaped = stripped.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                code_buffer.append(escaped or '&nbsp;')
                continue

            if not stripped:
                story.append(Spacer(1, 4))
                continue

            # Heading 1
            if stripped.startswith('# '):
                text = stripped[2:].strip()
                story.append(Paragraph(text, title_style if len(story) <= 3 else h1_style))
            # Heading 2
            elif stripped.startswith('## '):
                text = stripped[3:].strip()
                story.append(Paragraph(text, h1_style))
            # Heading 3
            elif stripped.startswith('### '):
                text = stripped[4:].strip()
                story.append(Paragraph(text, h2_style))
            # Bullets
            elif stripped.startswith('- ') or stripped.startswith('* '):
                text = stripped[2:].strip()
                formatted_text = DocumentExporter._format_inline_markdown(text)
                story.append(Paragraph(f"&bull; {formatted_text}", bullet_style))
            # Dividers
            elif stripped.startswith('---') or stripped.startswith('***'):
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceBefore=8, spaceAfter=8))
            # Tables
            elif stripped.startswith('|') and stripped.endswith('|'):
                # Simplified table inline
                cells = [c.strip() for c in stripped.strip('|').split('|')]
                if not all(re.match(r'^:?-+:?$', c) for c in cells if c):
                    row_text = " | ".join(cells)
                    story.append(Paragraph(DocumentExporter._format_inline_markdown(row_text), body_style))
            # Regular Paragraph
            else:
                formatted_text = DocumentExporter._format_inline_markdown(stripped)
                story.append(Paragraph(formatted_text, body_style))

        # Build PDF
        try:
            doc.build(story)
            pdf_data = buffer.getvalue()
            buffer.close()
            return pdf_data
        except Exception as e:
            logger.error(f"Error building PDF: {e}")
            # Minimal fallback PDF
            buffer = io.BytesIO()
            fallback_doc = SimpleDocTemplate(buffer, pagesize=letter)
            fallback_story = [
                Paragraph(f"<b>{title}</b>", title_style),
                Spacer(1, 10),
                Paragraph(DocumentExporter._format_inline_markdown(markdown_text[:5000]), body_style)
            ]
            fallback_doc.build(fallback_story)
            pdf_data = buffer.getvalue()
            buffer.close()
            return pdf_data

    @staticmethod
    def _format_inline_markdown(text: str) -> str:
        """Escape HTML and format bold/italics/code for ReportLab Paragraphs."""
        # Escape XML entities
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        # Bold: **text** or __text__
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
        # Italics: *text* or _text_
        text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
        text = re.sub(r'_(.*?)_', r'<i>\1</i>', text)
        # Inline code: `text`
        text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#0f172a"><b>\1</b></font>', text)
        return text
