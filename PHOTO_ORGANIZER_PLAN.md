# Photo/Video Organizer App Plan (iPhone → Mac)

## Goal
Create a macOS desktop app that connects to an iPhone and automatically imports photos/videos into **existing folder structures** (e.g., Year/Month/Event). The app should preserve metadata, avoid duplicates, and organize media based on rules your wife already uses.

## Recommended Approach (Practical + Reliable)
### Option A: macOS App + iOS Companion (Best UX)
- **macOS app** handles organization rules, folder management, and import history.
- **iOS companion app** reads the photo library (PhotoKit) and streams selected assets to the Mac (USB or local Wi‑Fi).
- Pros: Full control over metadata, progress, selection, and organization.
- Cons: Requires building two apps.

### Option B: macOS App Only (Limited)
- Uses **Image Capture/PTP** to import from iPhone over USB.
- Pros: No iOS app required.
- Cons: More limited metadata handling; less control over selection.

## Core Features
1. **Connect & Detect iPhone**
   - USB connection detection.
   - Optional Wi‑Fi pairing (Bonjour/mDNS discovery).

2. **Import & Deduplicate**
   - Read EXIF/HEIC/QuickTime metadata.
   - Compute a content hash (SHA‑256) per file.
   - Maintain a local SQLite index of imported hashes + original filenames.

3. **Folder Mapping Rules**
   - Rule examples:
     - `Photos/2024/2024-08 August/Italy Trip/`
     - `Videos/2024/2024-08 August/`
   - Allow templated rules using date, location, and media type.

4. **Preserve Metadata**
   - Keep original creation date/time.
   - Preserve Live Photo pairs (HEIC + MOV).

5. **Review & Approve (Optional)**
   - Show a preview list before import.
   - Auto‑import mode once trusted.

## Suggested Tech Stack
### macOS App
- **Swift + SwiftUI** (native, best for macOS integration).
- **PhotoKit** for metadata (if reading via iOS app).
- **FileManager** for folder creation and moves.
- **SQLite** or CoreData for import history.

### iOS Companion (Optional)
- **SwiftUI + PhotoKit** to access the photo library.
- **NSFileProvider / app‑to‑app transfer** via network.
- Use **URLSession** or **MultipeerConnectivity** for transfer.

## Data Model (Example)
- `ImportRecord`:
  - `id`, `sha256`, `originalFilename`, `createdAt`, `deviceId`, `destinationPath`
- `Rule`:
  - `id`, `name`, `templateString`, `mediaTypeFilter`

## Folder Template Examples
- `Photos/{YYYY}/{YYYY-MM} {MonthName}/{EventName}/`
- `Videos/{YYYY}/{YYYY-MM} {MonthName}/`
- `Family/{YYYY}/{ChildName}/` (manual tag during review)

## Development Phases
1. **MVP (USB import, rules, dedupe)**
2. **Add preview + tagging UI**
3. **Optional iOS companion for better metadata + Wi‑Fi sync**
4. **Polish: background import, notifications, error handling**

## Why This Works Well for Your Wife
- She keeps her existing folder system.
- The app *follows her structure*, not a new one.
- Reliable deduplication prevents re‑imports.
- Minimal manual work once rules are set.
