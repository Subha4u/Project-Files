# Land Record Formatter

A complete production-ready offline web application that converts BanglarBhumi Land Record HTML/MHTML pages into professionally formatted A4 documents.

## Features

- **Parse HTML/MHTML** — Automatically extracts HTML from MHTML/MHT files
- **Bengali keyword search** — Finds data using খতিয়ান নং, রায়তের নাম, দাগ নং etc.
- **A4 Document Preview** — Real 210mm × 297mm formatted preview
- **PDF Export** — Selectable text PDF (not screenshots)
- **DOCX Export** — Microsoft Word compatible documents
- **Batch Processing** — Supports 1000+ files with progress tracking
- **ZIP Export** — Export all PDFs and DOCXs as ZIP archive
- **Print** — Professional print stylesheet with correct margins
- **Dark Theme** — Professional UI inspired by VS Code / Adobe Acrobat

## Quick Start

1. Open `index.html` in any modern browser
2. Drag & drop BanglarBhumi HTML/MHTML files
3. Preview the formatted A4 document
4. Export as PDF, DOCX, or both

## Supported Input

| Format | Extension |
|--------|-----------|
| HTML   | `.html`   |
| MHTML  | `.mhtml`  |
| MHT    | `.mht`    |

## Keyboard Shortcuts

| Shortcut     | Action           |
|-------------|------------------|
| Ctrl+O      | Open files       |
| Ctrl+P      | Print            |
| Ctrl+=      | Zoom in          |
| Ctrl+-      | Zoom out         |
| Ctrl+B      | Toggle sidebar   |
| ↑/↓        | Navigate files   |

## Data Extraction

The parser searches for tables using Bengali keywords:

### Information Table
- খতিয়ান নং (Khatian Number)
- রায়তের নাম (Owner Name)
- পিতা/স্বামী (Father/Husband)
- ঠিকানা (Address)
- জমির পরিমাণ (Land Area)
- দাগের সংখ্যা (Number of Plots)

### Plot Details Table
- দাগ নং (Plot Number)
- শ্রেণী (Classification)
- অংশ (Share)
- অংশ পরিমাণ(একর) (Share Area in Acres)
- দখলদার (Possessor)
- মন্তব্য (Remarks)

## JSON Data Model

```json
{
  "header": {
    "district": "[11] PURBA MEDINIPUR",
    "block": "[26] PATASHPUR-2",
    "mouza": "[281] Singari"
  },
  "liveData": "Live Data As On 15/01/2025",
  "jl": "123",
  "thana": "Patashpur",
  "info": [
    { "key": "khatianNo", "label": "খতিয়ান নং", "value": "1234" },
    { "key": "raiyatName", "label": "রায়তের নাম", "value": "..." }
  ],
  "dag": [
    { "দাগ নং": "100", "শ্রেণী": "...", "অংশ": "...", "অংশ পরিমাণ(একর)": "0.5", "দখলদার": "...", "মন্তব্য": "" }
  ]
}
```

## Technology Stack

- HTML5
- CSS3 (Glassmorphism dark theme)
- Vanilla JavaScript (ES Modules pattern)
- jsPDF + AutoTable for PDF generation
- JSZip for ZIP archive creation
- No frameworks, no backend

## Logo

Place `assets/bl.png` (BanglarBhumi logo) in the assets folder. The logo will be displayed at the top of each formatted document.

## License

MIT
