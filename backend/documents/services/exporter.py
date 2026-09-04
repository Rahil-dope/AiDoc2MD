import io
import re
import logging
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors

logger = logging.getLogger(__name__)


class DocumentExporter:
    """
    Exports Markdown documents to formatted PDF and clean Markdown bundles.
    Properly parses Markdown elements (Headings, Paragraphs, Lists, Blockquotes,
    Code Blocks, Tables, and Dividers) into stylized ReportLab Flowables.
    """

    @staticmethod
    def markdown_to_pdf_bytes(markdown_text: str, title: str = "Document") -> bytes:
        """
        Convert Markdown text to a polished, visually rendered PDF document buffer.
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

        # Typography Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=10
        )

        h1_style = ParagraphStyle(
            'CustomH1',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=19,
            textColor=colors.HexColor('#0f172a'),
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            'CustomH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )

        h3_style = ParagraphStyle(
            'CustomH3',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155'),
            spaceAfter=5
        )

        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155'),
            leftIndent=14,
            spaceAfter=3
        )

        blockquote_style = ParagraphStyle(
            'CustomBlockquote',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569'),
            leftIndent=16,
            rightIndent=16,
            backColor=colors.HexColor('#f8fafc'),
            borderColor=colors.HexColor('#cbd5e1'),
            borderWidth=0.5,
            borderPadding=6,
            spaceBefore=6,
            spaceAfter=6
        )

        code_style = ParagraphStyle(
            'CustomCode',
            parent=styles['Code'],
            fontName='Courier',
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor('#0f172a'),
            backColor=colors.HexColor('#f1f5f9'),
            borderColor=colors.HexColor('#e2e8f0'),
            borderWidth=0.5,
            borderPadding=6,
            spaceBefore=6,
            spaceAfter=6
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
            alignment=0
        )

        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#1e293b'),
            alignment=0
        )

        story = []

        # Header banner
        story.append(Paragraph(f"<b>AiDoc2MD</b> Export &mdash; {DocumentExporter._escape_xml(title)}", ParagraphStyle('Sub', fontSize=8, textColor=colors.HexColor('#64748b'))))
        story.append(Spacer(1, 3))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=10))

        # Printable page width: letter width (612) - margins (54 * 2) = 504 pt
        PAGE_CONTENT_WIDTH = 504

        lines = markdown_text.split('\n')
        i = 0
        n_lines = len(lines)

        while i < n_lines:
            raw_line = lines[i]
            stripped = raw_line.strip()

            # 1. Empty lines
            if not stripped:
                i += 1
                continue

            # 2. Code Blocks (``` ... ```)
            if stripped.startswith('```'):
                code_lines = []
                i += 1
                while i < n_lines and not lines[i].strip().startswith('```'):
                    code_lines.append(DocumentExporter._escape_xml(lines[i]))
                    i += 1
                if i < n_lines and lines[i].strip().startswith('```'):
                    i += 1  # consume closing ```
                code_text = "<br/>".join(code_lines) if code_lines else "&nbsp;"
                story.append(Paragraph(code_text, code_style))
                story.append(Spacer(1, 4))
                continue

            # 3. Tables (| ... |)
            if stripped.startswith('|') and '|' in stripped[1:]:
                table_lines = []
                while i < n_lines and lines[i].strip().startswith('|') and '|' in lines[i].strip()[1:]:
                    table_lines.append(lines[i].strip())
                    i += 1

                flowable_table = DocumentExporter._render_table(
                    table_lines,
                    table_header_style,
                    table_cell_style,
                    PAGE_CONTENT_WIDTH
                )
                if flowable_table:
                    story.append(flowable_table)
                    story.append(Spacer(1, 6))
                continue

            # 4. Blockquotes (> ...)
            if stripped.startswith('>'):
                quote_lines = []
                while i < n_lines and lines[i].strip().startswith('>'):
                    quote_text = lines[i].strip().lstrip('>').strip()
                    quote_lines.append(DocumentExporter._format_inline_markdown(quote_text))
                    i += 1
                combined_quote = "<br/>".join(quote_lines)
                story.append(Paragraph(combined_quote, blockquote_style))
                story.append(Spacer(1, 4))
                continue

            # 5. Horizontal Rules (---, ***, ___)
            if re.match(r'^(?:-{3,}|\*{3,}|_{3,})$', stripped):
                story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#cbd5e1'), spaceBefore=6, spaceAfter=6))
                i += 1
                continue

            # 6. Headings (#)
            if stripped.startswith('#'):
                heading_match = re.match(r'^(#{1,6})\s+(.*)$', stripped)
                if heading_match:
                    level = len(heading_match.group(1))
                    htext = DocumentExporter._format_inline_markdown(heading_match.group(2).strip())
                    if level == 1:
                        story.append(Paragraph(htext, title_style if len(story) <= 3 else h1_style))
                    elif level == 2:
                        story.append(Paragraph(htext, h1_style))
                    elif level == 3:
                        story.append(Paragraph(htext, h2_style))
                    else:
                        story.append(Paragraph(htext, h3_style))
                    i += 1
                    continue

            # 7. Unordered Lists (-, *, +)
            if re.match(r'^[-*+]\s+(.*)$', stripped):
                list_text = re.match(r'^[-*+]\s+(.*)$', stripped).group(1)
                formatted_item = DocumentExporter._format_inline_markdown(list_text)
                story.append(Paragraph(f"&bull;&nbsp;&nbsp;{formatted_item}", bullet_style))
                i += 1
                continue

            # 8. Ordered Lists (1., 2., etc.)
            num_list_match = re.match(r'^(\d+)\.\s+(.*)$', stripped)
            if num_list_match:
                num = num_list_match.group(1)
                list_text = num_list_match.group(2)
                formatted_item = DocumentExporter._format_inline_markdown(list_text)
                story.append(Paragraph(f"<b>{num}.</b>&nbsp;&nbsp;{formatted_item}", bullet_style))
                i += 1
                continue

            # 9. Standard Paragraph
            formatted_text = DocumentExporter._format_inline_markdown(stripped)
            story.append(Paragraph(formatted_text, body_style))
            i += 1

        # Build PDF Document
        try:
            doc.build(story)
            pdf_data = buffer.getvalue()
            buffer.close()
            return pdf_data
        except Exception as e:
            logger.error(f"Error building formatted PDF: {e}", exc_info=True)
            # Safe Fallback Document
            buffer = io.BytesIO()
            fallback_doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
            fallback_story = [
                Paragraph(f"<b>{DocumentExporter._escape_xml(title)}</b>", title_style),
                Spacer(1, 10),
                Paragraph(DocumentExporter._format_inline_markdown(markdown_text[:8000]), body_style)
            ]
            fallback_doc.build(fallback_story)
            pdf_data = buffer.getvalue()
            buffer.close()
            return pdf_data

    @staticmethod
    def _render_table(
        table_lines: List[str],
        header_style: ParagraphStyle,
        cell_style: ParagraphStyle,
        page_width: float
    ) -> Optional[Table]:
        """
        Parses Markdown table lines into a properly styled ReportLab Table flowable.
        """
        if not table_lines:
            return None

        parsed_rows = []
        for line in table_lines:
            cells = [c.strip() for c in line.strip('|').split('|')]
            # Check if separator row (| --- | :---: |)
            if all(re.match(r'^:?-+:?$', c) for c in cells if c):
                continue
            parsed_rows.append(cells)

        if not parsed_rows:
            return None

        # Normalize column count across all rows
        max_cols = max(len(r) for r in parsed_rows)
        if max_cols == 0:
            return None

        col_width = page_width / max_cols

        table_data = []
        for row_idx, row in enumerate(parsed_rows):
            # Pad row if short
            padded_row = row + [''] * (max_cols - len(row))
            formatted_row = []
            for cell in padded_row:
                style = header_style if row_idx == 0 else cell_style
                cell_p = Paragraph(DocumentExporter._format_inline_markdown(cell) or '&nbsp;', style)
                formatted_row.append(cell_p)
            table_data.append(formatted_row)

        table_flowable = Table(
            table_data,
            colWidths=[col_width] * max_cols
        )

        table_style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#94a3b8')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]

        # Add alternating row backgrounds
        for r_idx in range(1, len(table_data)):
            bg = colors.HexColor('#f8fafc') if r_idx % 2 == 1 else colors.white
            table_style_commands.append(('BACKGROUND', (0, r_idx), (-1, r_idx), bg))

        table_flowable.setStyle(TableStyle(table_style_commands))
        return table_flowable

    @staticmethod
    def _escape_xml(text: str) -> str:
        """Escape standard XML / HTML characters."""
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    @staticmethod
    def _format_inline_markdown(text: str) -> str:
        """
        Escapes XML and converts inline Markdown formatting (bold, italic, code, links)
        into ReportLab-supported XML tags.
        """
        if not text:
            return ""

        # 1. Escape XML characters
        text = DocumentExporter._escape_xml(text)

        # 2. Inline Code: `code`
        text = re.sub(
            r'`([^`]+)`',
            r'<font face="Courier" color="#0f172a" backcolor="#f1f5f9"><b>&nbsp;\1&nbsp;</b></font>',
            text
        )

        # 3. Bold: **bold** or __bold__
        text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)

        # 4. Italic: *italic* or _italic_
        text = re.sub(r'(?<!\*)\*([^*]+?)\*(?!\*)', r'<i>\1</i>', text)
        text = re.sub(r'(?<!_)_([^_]+?)_(?!_)', r'<i>\1</i>', text)

        # 5. Links: [text](url)
        text = re.sub(r'\[(.*?)\]\((.*?)\)', r'<font color="#2563eb"><u>\1</u></font>', text)

        return text
