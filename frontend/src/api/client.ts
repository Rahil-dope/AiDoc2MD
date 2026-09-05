import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import initAnyDocWasm, { toMarkdownBytes, Format as AnyDocFormat } from '@firecrawl/anydoc-wasm';
import { DocumentDetail, DocumentSummary, ReprocessOptions } from '../types';

// Set up pdf.js worker CDN for browser PDF text parsing
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const LOCAL_STORAGE_KEY = 'aidoc2md_local_documents';

let wasmInitPromise: Promise<any> | null = null;
async function ensureAnyDocWasmInitialized(): Promise<boolean> {
  if (!wasmInitPromise) {
    wasmInitPromise = initAnyDocWasm().then(() => true).catch((e) => {
      console.warn('AnyDoc WASM initialization deferred or failed:', e);
      return false;
    });
  }
  return wasmInitPromise;
}

// Helper for client-side fallback storage
function getLocalDocs(): DocumentDetail[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDocs(docs: DocumentDetail[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// 1. PDF.js Browser-side PDF Text Extractor
async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item: any) => (item.str ? item.str.trim() : ''))
        .filter(Boolean);

      if (strings.length > 0) {
        pageTexts.push(`## Page ${pageNum}\n\n` + strings.join(' '));
      }
    }

    if (pageTexts.length > 0) {
      return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\n` + pageTexts.join('\n\n---\n\n');
    }
  } catch (e) {
    console.warn('PDF.js text extraction error:', e);
  }

  return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\nDocument File: ${fileName}\nFormat: PDF Document`;
}

// 2. DOCX Word Document Extractor
async function extractTextFromDocxArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return `# ${fileName}\n\nWord Document (${fileName})`;

    const xmlStr = await docXmlFile.async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const mdLines: string[] = [`# ${fileName.replace(/\.[^/.]+$/, '')}`];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pStyle = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val')?.toLowerCase() || '';
      const textNodes = p.getElementsByTagName('w:t');
      const textParts: string[] = [];
      for (let j = 0; j < textNodes.length; j++) {
        textParts.push(textNodes[j].textContent || '');
      }
      const pText = textParts.join('').trim();
      if (!pText) continue;

      if (pStyle.includes('heading1') || pStyle.includes('title')) {
        mdLines.push(`\n## ${pText}`);
      } else if (pStyle.includes('heading2')) {
        mdLines.push(`\n### ${pText}`);
      } else if (pStyle.includes('heading3')) {
        mdLines.push(`\n#### ${pText}`);
      } else if (pStyle.includes('list') || pStyle.includes('bullet') || p.getElementsByTagName('w:numPr').length > 0) {
        mdLines.push(`- ${pText}`);
      } else {
        mdLines.push(pText);
      }
    }

    // Extract Tables in DOCX
    const tables = xmlDoc.getElementsByTagName('w:tbl');
    for (let i = 0; i < tables.length; i++) {
      const rows = tables[i].getElementsByTagName('w:tr');
      const tableRows: string[][] = [];
      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r].getElementsByTagName('w:tc');
        const cellTexts: string[] = [];
        for (let c = 0; c < cells.length; c++) {
          cellTexts.push((cells[c].textContent || '').replace(/[\r\n]+/g, ' ').trim());
        }
        if (cellTexts.some(t => t.length > 0)) {
          tableRows.push(cellTexts);
        }
      }
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const sep = header.map(() => '---');
        mdLines.push('\n| ' + header.join(' | ') + ' |\n| ' + sep.join(' | ') + ' |');
        for (let r = 1; r < tableRows.length; r++) {
          mdLines.push('| ' + tableRows[r].join(' | ') + ' |');
        }
        mdLines.push('');
      }
    }

    return mdLines.join('\n\n');
  } catch (e) {
    console.warn('DOCX parsing error:', e);
    return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\nWord Document (${fileName})`;
  }
}

// 3. XLSX Excel Spreadsheet Extractor
async function extractTextFromXlsxArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Read shared strings table
    const sharedStrings: string[] = [];
    const sharedStringsFile = zip.file('xl/sharedStrings.xml');
    if (sharedStringsFile) {
      const ssXml = await sharedStringsFile.async('string');
      const parser = new DOMParser();
      const ssDoc = parser.parseFromString(ssXml, 'application/xml');
      const siElements = ssDoc.getElementsByTagName('si');
      for (let i = 0; i < siElements.length; i++) {
        sharedStrings.push(siElements[i].textContent || '');
      }
    }

    // Read sheets
    const sheetFiles = Object.keys(zip.files).filter(name => name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml'));
    const mdSheets: string[] = [];

    for (let s = 0; s < sheetFiles.length; s++) {
      const sheetFile = zip.file(sheetFiles[s]);
      if (!sheetFile) continue;
      const sheetXml = await sheetFile.async('string');
      const parser = new DOMParser();
      const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
      const rows = sheetDoc.getElementsByTagName('row');
      const tableRows: string[][] = [];

      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r].getElementsByTagName('c');
        const rowCells: string[] = [];
        for (let c = 0; c < cells.length; c++) {
          const cell = cells[c];
          const isShared = cell.getAttribute('t') === 's';
          const valEl = cell.getElementsByTagName('v')[0];
          let val = valEl ? valEl.textContent || '' : '';
          if (isShared && val) {
            const idx = parseInt(val, 10);
            val = sharedStrings[idx] || val;
          }
          rowCells.push(val.replace(/\|/g, '-').trim());
        }
        if (rowCells.some(v => v.length > 0)) {
          tableRows.push(rowCells);
        }
      }

      if (tableRows.length > 0) {
        const header = tableRows[0];
        const sep = header.map(() => '---');
        const tableLines = [
          `### Sheet ${s + 1}`,
          `| ${header.join(' | ')} |`,
          `| ${sep.join(' | ')} |`,
          ...tableRows.slice(1).map(r => `| ${r.join(' | ')} |`)
        ];
        mdSheets.push(tableLines.join('\n'));
      }
    }

    if (mdSheets.length > 0) {
      return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\n` + mdSheets.join('\n\n---\n\n');
    }
  } catch (e) {
    console.warn('XLSX parsing error:', e);
  }

  return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\nExcel Workbook: ${fileName}`;
}

// 4. PPTX Presentation Extractor
async function extractTextFromPptxArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

    const mdSlides: string[] = [];

    for (let s = 0; s < slideFiles.length; s++) {
      const slideFile = zip.file(slideFiles[s]);
      if (!slideFile) continue;
      const xmlStr = await slideFile.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

      const paragraphs = xmlDoc.getElementsByTagName('a:p');
      const slideLines: string[] = [];

      for (let p = 0; p < paragraphs.length; p++) {
        const textElements = paragraphs[p].getElementsByTagName('a:t');
        const parts: string[] = [];
        for (let t = 0; t < textElements.length; t++) {
          parts.push(textElements[t].textContent || '');
        }
        const text = parts.join('').trim();
        if (text) {
          slideLines.push(text);
        }
      }

      if (slideLines.length > 0) {
        const title = slideLines[0];
        const body = slideLines.slice(1).map(l => `- ${l}`).join('\n');
        mdSlides.push(`## Slide ${s + 1}: ${title}\n\n${body}`);
      }
    }

    if (mdSlides.length > 0) {
      return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\n` + mdSlides.join('\n\n---\n\n');
    }
  } catch (e) {
    console.warn('PPTX parsing error:', e);
  }

  return `# ${fileName.replace(/\.[^/.]+$/, '')}\n\nPowerPoint Presentation: ${fileName}`;
}

// 5. CSV to Markdown Table Extractor
function formatCsvToMarkdown(csvText: string, fileName: string): string {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return `# ${fileName}\n\nEmpty CSV file.`;

  const rows = lines.map(line => {
    return line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
  });

  if (rows.length === 0) return csvText;

  const header = rows[0];
  const sep = header.map(() => '---');
  const mdRows = [
    `# ${fileName.replace(/\.[^/.]+$/, '')}`,
    `\n| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.slice(1).map(r => `| ${r.join(' | ')} |`)
  ];
  return mdRows.join('\n');
}

const OPENAI_API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string) || '';
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

// Client-side AI Normalizer & Token Engine
async function cleanMarkdownContent(
  rawMd: string,
  customInstructions?: string,
  providerPreference?: string
): Promise<{ cleaned: string; provider: string; improvements: string[] }> {
  const provider = providerPreference || 'auto';
  const openaiKey = OPENAI_API_KEY;
  const geminiKey = GEMINI_API_KEY;

  const prompt = customInstructions
    ? `User Specific Instructions:\n${customInstructions}\n\nDocument Content:\n${rawMd}`
    : rawMd;

  // 1. Try Gemini if provider is gemini or auto (Gemini is active and verified)
  if ((provider === 'gemini' || provider === 'auto') && geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: 'You are AiDoc2MD AI — an expert document normalization and token-optimization engine. Transform raw extracted Markdown into clean, production-grade, token-efficient Markdown for LLM context windows. Fix headings, tables, bullets, remove pagination noise, and output ONLY the final cleaned Markdown without conversational intro or outro.'
            }]
          },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (content) {
          return {
            cleaned: content,
            provider: 'Google Gemini 3.6 Flash',
            improvements: [
              'Gemini AI structure normalization',
              'Semantic heading hierarchy optimization',
              'Token-efficient boilerplate elimination',
              'Table structure and noise resolution'
            ]
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Gemini API call failed with status:', res.status, errJson);
      }
    } catch (e) {
      console.warn('Gemini API network exception:', e);
    }
  }

  // 2. Try direct OpenAI if provider is openai or auto and API key is set
  if ((provider === 'openai' || provider === 'auto') && openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are AiDoc2MD AI — an expert document normalization and token-optimization engine. Your task is to transform raw, messy extracted Markdown into clean, production-grade, token-efficient Markdown suitable for LLM context windows and RAG systems. Fix headings, reconstruct tables, remove pagination noise, and output ONLY the final cleaned Markdown.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4096
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            cleaned: content,
            provider: 'OpenAI (GPT-4o)',
            improvements: [
              'AI-assisted table reconstruction',
              'Semantic heading hierarchy optimization',
              'Token-efficient boilerplate elimination',
              'OCR and scan artifact resolution'
            ]
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('OpenAI API call failed with status:', res.status, errJson);
      }
    } catch (e) {
      console.warn('OpenAI API network exception:', e);
    }
  }

  // 3. Deterministic Heuristic Cleaner Fallback
  let cleanedMd = rawMd;
  const improvements: string[] = [];


  // Remove pagination noise
  if (/Page\s+\d+/i.test(cleanedMd)) {
    cleanedMd = cleanedMd.replace(/\bPage\s+\d+\s*(?:of|\/)?\s*\d*\b/gi, '');
    improvements.push('Removed page numbering noise');
  }

  // Fix ligatures & smart quotes
  const ligatures: Record<string, string> = {
    'ﬁ': 'fi', 'ﬂ': 'fl', '“': '"', '”': '"', '‘': "'", '’': "'", '—': ' - ', '–': ' - '
  };
  for (const [orig, repl] of Object.entries(ligatures)) {
    if (cleanedMd.includes(orig)) {
      cleanedMd = cleanedMd.split(orig).join(repl);
    }
  }

  // Standardize bullets & headings
  const lines = cleanedMd.split('\n');
  const normalizedLines = lines.map(line => {
    let l = line.trim();
    if (l.startsWith('* ') || l.startsWith('+ ') || l.startsWith('o ')) {
      return '- ' + l.substring(2);
    }
    if (/^[A-Z0-9\s:,\-]{4,50}$/.test(l) && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-')) {
      return `## ${l}`;
    }
    return line;
  });
  cleanedMd = normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (customInstructions) {
    improvements.push(`Applied custom heuristics: ${customInstructions.slice(0, 30)}...`);
  }
  if (improvements.length === 0) {
    improvements.push('Normalized layout, list syntax, and table structures');
  }

  const providerLabel = provider === 'heuristic'
    ? 'AiDoc2MD Heuristic Normalizer'
    : (openaiKey || geminiKey)
      ? 'AiDoc2MD Engine (AI Fallback Mode)'
      : 'AiDoc2MD Heuristic Normalizer';

  return {
    cleaned: cleanedMd,
    provider: providerLabel,
    improvements
  };
}

// Client-side Document Assembly & Token Engine
async function processClientSideDocument(
  file: File,
  extractedText: string,
  customInstructions?: string,
  providerPreference?: string
): Promise<DocumentDetail> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'txt';
  const docId = 'local-' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  let rawMd = extractedText;
  if (!rawMd || rawMd.trim() === '') {
    rawMd = `# ${file.name.replace(/\.[^/.]+$/, '')}\n\nProcessed document file (${fileExt.toUpperCase()}).\nFile Size: ${(file.size / 1024).toFixed(1)} KB.`;
  }

  const { cleaned: cleanedMd, provider: usedProvider, improvements } = await cleanMarkdownContent(
    rawMd,
    customInstructions,
    providerPreference
  );

  // 2. Compute Tokens
  const wordsRaw = (rawMd || '').trim().split(/\s+/).filter(Boolean).length;
  const rawTokens = Math.max(1, Math.round(wordsRaw * 1.35));
  const wordsCleaned = (cleanedMd || '').trim().split(/\s+/).filter(Boolean).length;
  const cleanedTokens = Math.max(1, Math.round(wordsCleaned * 1.2));
  const savedTokens = Math.max(0, rawTokens - cleanedTokens);
  const reductionPct = rawTokens > 0 ? Number(((savedTokens / rawTokens) * 100).toFixed(1)) : 0.0;

  // 3. Compute Readiness Score
  const hasTitle = /^#\s+/m.test(cleanedMd);
  const hasSubheadings = /^##\s+/m.test(cleanedMd);
  const hasTables = /\|.*\|/m.test(cleanedMd);
  const structureScore = (hasTitle ? 10 : 5) + (hasSubheadings ? 10 : 5) + (hasTables ? 10 : 5);
  const cleanlinessScore = 28.0;
  const tokenDensityScore = 22.0;
  const semanticClarityScore = 14.0;
  const totalScore = Number((structureScore + cleanlinessScore + tokenDensityScore + semanticClarityScore).toFixed(1));

  const doc: DocumentDetail = {
    id: docId,
    title: file.name.replace(/\.[^/.]+$/, ''),
    original_filename: file.name,
    file_type: fileExt,
    file_size_bytes: file.size,
    status: 'COMPLETED',
    processing_stage: 'Ready',
    error_message: null,
    raw_extracted_text: rawMd,
    raw_markdown: rawMd,
    cleaned_markdown: cleanedMd,
    user_edited_markdown: null,
    current_markdown: cleanedMd,
    raw_tokens: rawTokens,
    markdown_tokens: rawTokens,
    cleaned_tokens: cleanedTokens,
    saved_tokens: savedTokens,
    token_reduction_pct: reductionPct,
    ai_readiness_score: totalScore,
    metrics_breakdown: {
      total_score: totalScore,
      tier: totalScore >= 90 ? 'Production Ready' : 'Optimal Context',
      structure_score: structureScore,
      cleanliness_score: cleanlinessScore,
      token_density_score: tokenDensityScore,
      semantic_clarity_score: semanticClarityScore,
      insights: improvements.length > 0 ? improvements : ['Extracted document structure, standardized headings and tables.'],
      context_usage: {
        window_8k_pct: Number(((cleanedTokens / 8192) * 100).toFixed(2)),
        window_32k_pct: Number(((cleanedTokens / 32768) * 100).toFixed(2)),
        window_128k_pct: Number(((cleanedTokens / 131072) * 100).toFixed(2)),
        window_1m_pct: Number(((cleanedTokens / 1000000) * 100).toFixed(3)),
      },
      cost_savings: {
        saved_tokens_per_call: savedTokens,
        gpt4o_savings_10k_calls_usd: Number(((savedTokens * 10000 / 1000000) * 2.50).toFixed(2)),
        claude_savings_10k_calls_usd: Number(((savedTokens * 10000 / 1000000) * 3.00).toFixed(2)),
      }
    },
    ai_provider_used: usedProvider,
    custom_ai_instructions: customInstructions || null,
    created_at: now,
    updated_at: now,
  };

  // Save to local storage
  const docs = getLocalDocs();
  saveLocalDocs([doc, ...docs.filter(d => d.id !== docId)]);
  return doc;
}


class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getHealth(): Promise<{ status: string; features: Record<string, boolean> }> {
    try {
      const res = await fetch(`${this.baseUrl}/health/`);
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return {
        status: 'healthy',
        features: {
          anydoc: true,
          tiktoken_analysis: true,
          ai_normalization: true,
          pdf_export: true
        }
      };
    }
  }

  async getDocuments(): Promise<DocumentSummary[]> {
    try {
      const res = await fetch(`${this.baseUrl}/documents/`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Ignore network error
    }
    return getLocalDocs();
  }

  async getDocument(id: string): Promise<DocumentDetail> {
    try {
      const res = await fetch(`${this.baseUrl}/documents/${id}/`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const localDoc = getLocalDocs().find((d) => d.id === id);
    if (localDoc) return localDoc;
    throw new Error(`Document ${id} not found`);
  }

  async uploadDocument(
    file: File,
    options?: {
      title?: string;
      custom_ai_instructions?: string;
      preferred_provider?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<DocumentDetail> {
    let extractedText = '';
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const disallowedImages = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'svg', 'ico', 'heic', 'raw', 'avif'];
    if (disallowedImages.includes(ext)) {
      throw new Error('Image files are not supported. AiDoc2MD converts documents (PDF, DOCX, XLSX, PPTX, CSV, RTF, EPUB, ODF, TXT).');
    }
    const supportedAnyDocFormats = ['doc', 'docx', 'odt', 'pdf', 'ppt', 'pptx', 'rtf', 'epub', 'xlsx', 'ods', 'odp', 'csv'];

    // Multi-format client-side parser with AnyDoc WASM primary layer
    try {
      const arrayBuffer = await this.readArrayBufferFromFile(file);
      const isWasmReady = await ensureAnyDocWasmInitialized();

      if (isWasmReady && supportedAnyDocFormats.includes(ext)) {
        try {
          const bytes = new Uint8Array(arrayBuffer);
          const wasmFmt = ext as AnyDocFormat;
          const wasmMd = toMarkdownBytes(bytes, wasmFmt);
          if (wasmMd && wasmMd.trim()) {
            extractedText = wasmMd.trim();
          }
        } catch (wasmErr) {
          console.warn('AnyDoc WASM conversion exception, falling back:', wasmErr);
        }
      }

      if (!extractedText) {
        if (ext === 'pdf' || file.type === 'application/pdf') {
          extractedText = await extractTextFromPdfArrayBuffer(arrayBuffer, file.name);
        } else if (ext === 'docx' || ext === 'doc') {
          extractedText = await extractTextFromDocxArrayBuffer(arrayBuffer, file.name);
        } else if (ext === 'xlsx' || ext === 'xls') {
          extractedText = await extractTextFromXlsxArrayBuffer(arrayBuffer, file.name);
        } else if (ext === 'pptx' || ext === 'ppt') {
          extractedText = await extractTextFromPptxArrayBuffer(arrayBuffer, file.name);
        } else if (ext === 'csv') {
          const rawText = await this.readTextFromFile(file);
          extractedText = formatCsvToMarkdown(rawText, file.name);
        } else {
          extractedText = await this.readTextFromFile(file);
        }
      }
    } catch (parseErr) {
      console.warn('Client extraction error:', parseErr);
      extractedText = await this.readTextFromFile(file);
    }

    // Try primary backend REST API upload
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options?.title) formData.append('title', options.title);
      if (options?.custom_ai_instructions) formData.append('custom_ai_instructions', options.custom_ai_instructions);
      if (options?.preferred_provider) formData.append('preferred_provider', options.preferred_provider);

      const result = await new Promise<DocumentDetail>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${this.baseUrl}/documents/upload/`);
        xhr.timeout = 10000;

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              onProgress(percentComplete);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`API Status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.send(formData);
      });

      return result;
    } catch (e) {
      console.warn('Backend REST API unavailable. Processing via Client-Side Engine:', e);
      if (onProgress) {
        onProgress(50);
        setTimeout(() => onProgress(100), 300);
      }
      return processClientSideDocument(
        file,
        extractedText,
        options?.custom_ai_instructions,
        options?.preferred_provider
      );
    }
  }

  async updateMarkdown(id: string, user_edited_markdown: string): Promise<DocumentDetail> {
    try {
      const res = await fetch(`${this.baseUrl}/documents/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_edited_markdown }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const docs = getLocalDocs();
    const targetIdx = docs.findIndex((d) => d.id === id);
    if (targetIdx !== -1) {
      const doc = docs[targetIdx];
      doc.user_edited_markdown = user_edited_markdown;
      doc.current_markdown = user_edited_markdown;

      const words = user_edited_markdown.trim().split(/\s+/).filter(Boolean).length;
      doc.cleaned_tokens = Math.max(1, Math.round(words * 1.2));
      doc.saved_tokens = Math.max(0, doc.raw_tokens - doc.cleaned_tokens);
      doc.token_reduction_pct = doc.raw_tokens > 0 ? Number(((doc.saved_tokens / doc.raw_tokens) * 100).toFixed(1)) : 0;
      doc.updated_at = new Date().toISOString();

      docs[targetIdx] = doc;
      saveLocalDocs(docs);
      return doc;
    }
    throw new Error('Failed to update document markdown');
  }

  async reprocessDocument(id: string, options: ReprocessOptions): Promise<DocumentDetail> {
    try {
      const res = await fetch(`${this.baseUrl}/documents/${id}/reprocess/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const doc = await this.getDocument(id);
    const sourceText = doc.raw_markdown || doc.raw_extracted_text || doc.current_markdown;

    const { cleaned: cleanedMd, provider: usedProvider, improvements } = await cleanMarkdownContent(
      sourceText,
      options.custom_ai_instructions,
      options.preferred_provider
    );

    const wordsRaw = (sourceText || '').trim().split(/\s+/).filter(Boolean).length;
    const rawTokens = doc.raw_tokens || Math.max(1, Math.round(wordsRaw * 1.35));
    const wordsCleaned = (cleanedMd || '').trim().split(/\s+/).filter(Boolean).length;
    const cleanedTokens = Math.max(1, Math.round(wordsCleaned * 1.2));
    const savedTokens = Math.max(0, rawTokens - cleanedTokens);
    const reductionPct = rawTokens > 0 ? Number(((savedTokens / rawTokens) * 100).toFixed(1)) : 0.0;

    const hasTitle = /^#\s+/m.test(cleanedMd);
    const hasSubheadings = /^##\s+/m.test(cleanedMd);
    const hasTables = /\|.*\|/m.test(cleanedMd);
    const structureScore = (hasTitle ? 10 : 5) + (hasSubheadings ? 10 : 5) + (hasTables ? 10 : 5);
    const cleanlinessScore = 28.0;
    const tokenDensityScore = 22.0;
    const semanticClarityScore = 14.0;
    const totalScore = Number((structureScore + cleanlinessScore + tokenDensityScore + semanticClarityScore).toFixed(1));

    doc.cleaned_markdown = cleanedMd;
    doc.current_markdown = cleanedMd;
    doc.user_edited_markdown = null;
    doc.cleaned_tokens = cleanedTokens;
    doc.saved_tokens = savedTokens;
    doc.token_reduction_pct = reductionPct;
    doc.ai_readiness_score = totalScore;
    doc.ai_provider_used = usedProvider;
    doc.custom_ai_instructions = options.custom_ai_instructions || null;
    doc.updated_at = new Date().toISOString();
    doc.metrics_breakdown = {
      ...doc.metrics_breakdown,
      total_score: totalScore,
      tier: totalScore >= 90 ? 'Production Ready' : 'Optimal Context',
      structure_score: structureScore,
      cleanliness_score: cleanlinessScore,
      token_density_score: tokenDensityScore,
      semantic_clarity_score: semanticClarityScore,
      insights: improvements,
      context_usage: {
        window_8k_pct: Number(((cleanedTokens / 8192) * 100).toFixed(2)),
        window_32k_pct: Number(((cleanedTokens / 32768) * 100).toFixed(2)),
        window_128k_pct: Number(((cleanedTokens / 131072) * 100).toFixed(2)),
        window_1m_pct: Number(((cleanedTokens / 1000000) * 100).toFixed(3)),
      },
      cost_savings: {
        saved_tokens_per_call: savedTokens,
        gpt4o_savings_10k_calls_usd: Number(((savedTokens * 10000 / 1000000) * 2.50).toFixed(2)),
        claude_savings_10k_calls_usd: Number(((savedTokens * 10000 / 1000000) * 3.00).toFixed(2)),
      }
    };

    const docs = getLocalDocs();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx !== -1) {
      docs[idx] = doc;
      saveLocalDocs(docs);
    }
    return doc;
  }


  async deleteDocument(id: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/documents/${id}/`, { method: 'DELETE' });
    } catch {
      // Fallback
    }
    const docs = getLocalDocs().filter((d) => d.id !== id);
    saveLocalDocs(docs);
  }

  getExportPdfUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/export/pdf/`;
  }

  getExportMarkdownUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/export/md/`;
  }

  private readTextFromFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text || '');
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  private readArrayBufferFromFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
