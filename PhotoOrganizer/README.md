# iPhone Photo Organizer

A macOS desktop application that automatically imports photos and videos from your iPhone and organizes them into your existing folder structure on an external hard drive.

## Features

- **Automatic USB Detection**: Detects when iPhone is connected via USB
- **Smart Organization**: Organizes photos/videos into customizable folder structures
  - Year/Month (e.g., `2024/2024-08 August/`)
  - Year/Month/Day (e.g., `2024/08/15/`)
  - Year Only (e.g., `2024/`)
- **Duplicate Prevention**: Uses SHA-256 hashing to prevent importing duplicates
- **Metadata Preservation**: Maintains original creation dates and times
- **Separate Media Types**: Option to keep photos and videos in separate folders
- **Import History**: SQLite database tracks all imported files
- **Progress Tracking**: Real-time progress updates and statistics

## Requirements

- macOS 13.0 or later
- Xcode 15.0 or later (for building)
- iPhone with photos/videos
- USB cable for connecting iPhone to Mac

## Installation

### Building from Source

1. Open the project in Xcode:
   ```bash
   cd PhotoOrganizer
   open PhotoOrganizer.xcodeproj
   ```

2. Select your development team in the project settings:
   - Click on the PhotoOrganizer project in the navigator
   - Select the PhotoOrganizer target
   - Go to "Signing & Capabilities"
   - Select your Team from the dropdown

3. Build and run:
   - Press `Cmd + R` or click the Run button
   - The app will launch automatically

## Usage

### First Time Setup

1. **Launch the App**: Open PhotoOrganizer from Applications or Xcode

2. **Connect iPhone**:
   - Plug your iPhone into your Mac via USB cable
   - If prompted on your iPhone, tap "Trust This Computer"
   - The app should show "iPhone Connected" with a green indicator

3. **Choose Destination Folder**:
   - Click "Choose..." button
   - Navigate to your external hard drive or desired location
   - Select the folder where you want photos organized

4. **Configure Organization Pattern**:
   - Select how you want folders organized:
     - **Year/Month**: Creates folders like `2024/2024-08 August/`
     - **Year/Month/Day**: Creates folders like `2024/08/15/`
     - **Year Only**: Creates folders like `2024/`

5. **Optional Settings**:
   - Toggle "Separate Photos and Videos folders" if you want them split
   - When enabled, creates `Photos/` and `Videos/` top-level folders

### Importing Photos

1. With iPhone connected and settings configured, click **Start Import**

2. The app will:
   - Scan all photos and videos on your iPhone
   - Show progress and current file being imported
   - Skip any duplicates automatically
   - Organize files according to your rules
   - Preserve original creation dates

3. Monitor the progress:
   - **Imported**: Count of successfully imported files
   - **Duplicates Skipped**: Files already in your collection
   - **Errors**: Any files that failed to import

4. Click **Cancel** at any time to stop the import process

## How It Works

### Duplicate Detection

The app uses SHA-256 hashing to identify duplicate files:
- Each file is hashed when imported
- Hash is stored in local SQLite database
- Before importing, file hash is checked against database
- Duplicates are automatically skipped

### Folder Organization

Files are organized based on their creation date:

**Example with Year/Month pattern and separate media types:**
```
External Drive/
├── Photos/
│   ├── 2024/
│   │   ├── 2024-01 January/
│   │   ├── 2024-02 February/
│   │   └── 2024-08 August/
│   └── 2023/
│       └── 2023-12 December/
└── Videos/
    ├── 2024/
    │   └── 2024-08 August/
    └── 2023/
        └── 2023-12 December/
```

**Example with Year/Month pattern without separate media types:**
```
External Drive/
├── 2024/
│   ├── 2024-01 January/
│   │   ├── IMG_1234.HEIC
│   │   ├── IMG_1235.HEIC
│   │   └── VID_5678.MOV
│   └── 2024-08 August/
│       ├── IMG_2345.HEIC
│       └── VID_6789.MP4
└── 2023/
    └── 2023-12 December/
        └── IMG_9876.JPG
```

### Supported File Formats

- **Photos**: JPEG, JPG, HEIC, PNG
- **Videos**: MOV, MP4, M4V

### Database Location

Import history is stored at:
```
~/Library/Application Support/PhotoOrganizer/imports.db
```

This database contains:
- SHA-256 hash of each imported file
- Original filename
- Destination path
- Import timestamp
- Device ID (when available)
- File size

## Permissions Required

The app requires the following macOS permissions:

- **USB Device Access**: To communicate with your iPhone
- **File System Access**: To read/write to selected folders
- **Camera/Photo Library**: To access iPhone photos via Image Capture

You'll be prompted to grant these permissions when first running the app.

## Troubleshooting

### iPhone Not Detected

1. Make sure iPhone is unlocked
2. Tap "Trust This Computer" on iPhone when prompted
3. Try unplugging and reconnecting the USB cable
4. Restart the app

### Import Errors

1. Check that you have write permission to the destination folder
2. Ensure external drive is connected and mounted
3. Check available disk space on destination
4. Look at the status message for specific error details

### App Won't Open

1. Check that you're running macOS 13.0 or later
2. If you see a security warning, go to System Settings > Privacy & Security
3. Click "Open Anyway" for PhotoOrganizer

## Future Enhancements

Potential improvements for future versions:

- **iOS Companion App**: Better metadata access and Wi-Fi sync
- **Event Tagging**: Manual or automatic event naming
- **Live Photo Support**: Preserve HEIC+MOV pairs
- **EXIF Metadata**: Parse and use detailed photo metadata
- **Location-Based Organization**: Organize by location tags
- **Background Import**: Continue import while using other apps
- **Notifications**: Alert when import completes

## Technical Details

### Built With

- **Swift 5.0**
- **SwiftUI** for the user interface
- **ImageCaptureCore** for iPhone communication
- **CryptoKit** for SHA-256 hashing
- **SQLite** for import history database

### Architecture

- `PhotoOrganizerApp.swift`: App entry point and SwiftUI app lifecycle
- `ContentView.swift`: Main user interface and interaction
- `ImportManager.swift`: Core import logic and device management
- `ImportDatabase.swift`: SQLite database operations for tracking imports

## License

This project is provided as-is for personal use.

## Support

For issues or questions, please check:
1. This README for common issues
2. The troubleshooting section above
3. macOS Console app for detailed error logs

---

**Note**: This app uses Image Capture framework which provides reliable USB import but limited metadata access. For enhanced features like Wi-Fi sync and better metadata handling, consider the iOS companion app approach outlined in `PHOTO_ORGANIZER_PLAN.md`.
