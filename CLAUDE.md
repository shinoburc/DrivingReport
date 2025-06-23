# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Progressive Web App (PWA) called "運転日報アプリ" (Driving Report App) for recording and managing driving logs. It's a client-side only application built with vanilla JavaScript, HTML5, and CSS3 - no framework dependencies.

## Key Architecture

### Data Storage
- All data stored in browser's LocalStorage
- No backend or database
- Key data structure:
```javascript
{
    id: timestamp,
    action: string, // '出発', '経由', '到着'
    destination: string,
    purpose: string,
    gasMeter: number,
    datetime: ISO string,
    location: { latitude, longitude, accuracy }
}
```

### Core Files
- **app.js**: Main application logic (980 lines) - handles all data operations, UI state, exports, encryption
- **index.html**: Single page application with tabs for different sections
- **sw.js**: Service Worker for offline functionality
- **camera-ocr.js**: Experimental OCR feature using Tesseract.js
- **install-prompt.js**: PWA installation handler

### Security Features
- AES-256-GCM encryption via Web Crypto API
- 8-character auto-generated passphrase
- Encryption functions: `encryptAES256GCM()` and `decryptAES256GCM()` in app.js

## Development Commands

### Local Development Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server
```
Access at `http://localhost:8000`

### Testing
- No automated tests present
- Manual testing required for:
  - GPS features (requires HTTPS/localhost + location permissions)
  - PWA installation
  - Offline functionality
  - Email export with encryption

## Important Development Notes

### GPS/Location Testing
- Must use HTTPS or localhost
- Requires browser location permissions
- Functions: `recordAction()`, `getLocation()` in app.js

### Adding New Features
1. Core logic goes in **app.js**
2. UI elements in **index.html**
3. Styles in **styles.css**
4. No build process - changes are immediate

### Modifying CSV Export
- Edit `generateCSV()` function in app.js:414
- Current headers: 日付,時刻,アクション,行先,目的,メーター,緯度,経度,精度

### Changing Action Types
- Modify `actionSettings` object in app.js
- Update UI in maintenance section
- Default actions: 出発, 経由, 到着

### Working with Encryption
- Uses Web Crypto API
- Key derivation: PBKDF2 with 100,000 iterations
- Encryption: AES-256-GCM
- Functions in app.js:523-623

## UI/UX Considerations
- All UI text is in Japanese
- Mobile-first responsive design
- Tabs: 記録, 記録一覧, エクスポート, メンテナンス
- Floating buttons for decrypt tool and PWA install

## Common Tasks

### To modify record structure:
1. Update data creation in `recordAction()` and `createManualRecord()`
2. Update display in `displayRecords()`
3. Update CSV export in `generateCSV()`
4. Update edit functionality in `editRecord()` and `saveEditedRecord()`

### To add new settings:
1. Add UI elements in maintenance tab (index.html)
2. Add save/load logic in app.js
3. Use LocalStorage keys prefixed appropriately

### To debug offline functionality:
1. Check Service Worker registration in console
2. Verify cache contents in DevTools > Application > Cache Storage
3. Test with DevTools offline mode

## Deployment
- Serve static files over HTTPS
- No build step required
- All files must be in same directory structure
- Service Worker requires HTTPS (except localhost)