import Foundation
import ImageCaptureCore
import Combine
import UniformTypeIdentifiers
import CryptoKit

@MainActor
class ImportManager: NSObject, ObservableObject {
    // Published properties for UI
    @Published var isDeviceConnected = false
    @Published var isImporting = false
    @Published var progress: Double = 0.0
    @Published var currentFile: String = ""
    @Published var totalImported: Int = 0
    @Published var skippedDuplicates: Int = 0
    @Published var errors: Int = 0
    @Published var statusMessage: String = ""
    @Published var hasError: Bool = false
    @Published var separateMediaTypes: Bool = true

    // Private properties
    private var deviceBrowser: ICDeviceBrowser?
    private var currentDevice: ICCameraDevice?
    private var database: ImportDatabase?
    private var isCancelled = false

    override init() {
        super.init()
        self.database = ImportDatabase()
    }

    func startDeviceMonitoring() {
        deviceBrowser = ICDeviceBrowser()
        deviceBrowser?.delegate = self
        deviceBrowser?.browsedDeviceTypeMask = ICDeviceTypeMask.camera.rawValue | ICDeviceLocationTypeMask.local.rawValue
        deviceBrowser?.start()
        statusMessage = "Monitoring for iPhone connection..."
    }

    func startImport(destinationPath: String, organizationRule: OrganizationRule) async {
        guard let device = currentDevice else {
            statusMessage = "No device connected"
            hasError = true
            return
        }

        isImporting = true
        isCancelled = false
        totalImported = 0
        skippedDuplicates = 0
        errors = 0
        progress = 0.0
        hasError = false
        statusMessage = "Starting import..."

        await importPhotos(from: device, to: destinationPath, rule: organizationRule)

        isImporting = false
        if !isCancelled {
            statusMessage = "Import completed! \(totalImported) files imported, \(skippedDuplicates) duplicates skipped"
        } else {
            statusMessage = "Import cancelled"
        }
    }

    func cancelImport() {
        isCancelled = true
        statusMessage = "Cancelling import..."
    }

    private func importPhotos(from device: ICCameraDevice, to destinationPath: String, rule: OrganizationRule) async {
        // Request to download files from camera
        guard let files = getAllMediaFiles(from: device) else {
            statusMessage = "Failed to access device files"
            hasError = true
            return
        }

        let totalFiles = files.count
        guard totalFiles > 0 else {
            statusMessage = "No photos or videos found on device"
            return
        }

        statusMessage = "Found \(totalFiles) files to process"

        for (index, file) in files.enumerated() {
            if isCancelled { break }

            currentFile = file.name ?? "Unknown"
            progress = Double(index) / Double(totalFiles)

            await importFile(file, to: destinationPath, rule: rule)
        }

        progress = 1.0
    }

    private func getAllMediaFiles(from device: ICCameraDevice) -> [ICCameraFile]? {
        guard let items = device.contents else { return nil }

        var mediaFiles: [ICCameraFile] = []

        func collectFiles(from items: [ICCameraItem]) {
            for item in items {
                if let file = item as? ICCameraFile {
                    // Filter for photos and videos
                    let ext = (file.name ?? "").lowercased()
                    if ext.hasSuffix(".jpg") || ext.hasSuffix(".jpeg") ||
                       ext.hasSuffix(".heic") || ext.hasSuffix(".png") ||
                       ext.hasSuffix(".mov") || ext.hasSuffix(".mp4") ||
                       ext.hasSuffix(".m4v") {
                        mediaFiles.append(file)
                    }
                } else if let folder = item as? ICCameraFolder {
                    if let contents = folder.contents {
                        collectFiles(from: contents)
                    }
                }
            }
        }

        collectFiles(from: items)
        return mediaFiles
    }

    private func importFile(_ file: ICCameraFile, to destinationPath: String, rule: OrganizationRule) async {
        guard let fileName = file.name else {
            errors += 1
            return
        }

        // Download file to temporary location
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        let success = await withCheckedContinuation { continuation in
            file.requestDownload(
                to: tempURL,
                options: [:]
            ) { error in
                continuation.resume(returning: error == nil)
            }
        }

        guard success else {
            errors += 1
            return
        }

        // Check for duplicates using hash
        do {
            let fileData = try Data(contentsOf: tempURL)
            let hash = sha256(data: fileData)

            if database?.isDuplicate(hash: hash) ?? false {
                skippedDuplicates += 1
                try? FileManager.default.removeItem(at: tempURL)
                return
            }

            // Get creation date from file metadata
            let creationDate = getCreationDate(from: tempURL) ?? Date()

            // Determine media type
            let mediaType = isVideo(fileName: fileName) ? MediaType.video : MediaType.photo

            // Generate destination path based on rule
            let relativePath = rule.formatPath(for: creationDate, mediaType: mediaType, separateTypes: separateMediaTypes)
            let fullDestPath = URL(fileURLWithPath: destinationPath).appendingPathComponent(relativePath)

            // Create destination directory if needed
            try FileManager.default.createDirectory(at: fullDestPath, withIntermediateDirectories: true)

            // Move file to destination
            let finalURL = fullDestPath.appendingPathComponent(fileName)

            // Handle filename conflicts
            let uniqueURL = getUniqueURL(for: finalURL)
            try FileManager.default.moveItem(at: tempURL, to: uniqueURL)

            // Preserve creation date
            try FileManager.default.setAttributes(
                [.creationDate: creationDate],
                ofItemAtPath: uniqueURL.path
            )

            // Record in database
            database?.recordImport(hash: hash, fileName: fileName, destinationPath: uniqueURL.path)

            totalImported += 1

        } catch {
            errors += 1
            statusMessage = "Error importing \(fileName): \(error.localizedDescription)"
            hasError = true
        }
    }

    private func sha256(data: Data) -> String {
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    private func getCreationDate(from url: URL) -> Date? {
        // Try to get creation date from file attributes
        if let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
           let creationDate = attributes[.creationDate] as? Date {
            return creationDate
        }

        // For HEIC/JPEG, could parse EXIF data here (would need additional library)
        // For MOV/MP4, could parse QuickTime metadata

        // Fallback to file modification date
        if let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
           let modDate = attributes[.modificationDate] as? Date {
            return modDate
        }

        return nil
    }

    private func isVideo(fileName: String) -> Bool {
        let ext = fileName.lowercased()
        return ext.hasSuffix(".mov") || ext.hasSuffix(".mp4") || ext.hasSuffix(".m4v")
    }

    private func getUniqueURL(for url: URL) -> URL {
        var uniqueURL = url
        var counter = 1

        while FileManager.default.fileExists(atPath: uniqueURL.path) {
            let fileExt = url.pathExtension
            let fileName = url.deletingPathExtension().lastPathComponent
            let directory = url.deletingLastPathComponent()

            uniqueURL = directory.appendingPathComponent("\(fileName)_\(counter).\(fileExt)")
            counter += 1
        }

        return uniqueURL
    }
}

// MARK: - ICDeviceBrowserDelegate
extension ImportManager: ICDeviceBrowserDelegate {
    nonisolated func deviceBrowser(_ browser: ICDeviceBrowser, didAdd device: ICDevice, moreComing: Bool) {
        guard let cameraDevice = device as? ICCameraDevice else { return }

        Task { @MainActor in
            currentDevice = cameraDevice
            cameraDevice.delegate = self
            cameraDevice.requestOpenSession()
        }
    }

    nonisolated func deviceBrowser(_ browser: ICDeviceBrowser, didRemove device: ICDevice, moreGoing: Bool) {
        Task { @MainActor in
            if device == currentDevice {
                currentDevice = nil
                isDeviceConnected = false
                statusMessage = "iPhone disconnected"
            }
        }
    }
}

// MARK: - ICDeviceDelegate
extension ImportManager: ICDeviceDelegate {
    nonisolated func didRemove(_ device: ICDevice) {
        Task { @MainActor in
            if device == currentDevice {
                currentDevice = nil
                isDeviceConnected = false
                statusMessage = "iPhone disconnected"
            }
        }
    }

    nonisolated func device(_ device: ICDevice, didOpenSessionWithError error: Error?) {
        Task { @MainActor in
            if error == nil {
                isDeviceConnected = true
                statusMessage = "iPhone connected and ready"
            } else {
                statusMessage = "Failed to connect to iPhone: \(error?.localizedDescription ?? "Unknown error")"
                hasError = true
            }
        }
    }

    nonisolated func device(_ device: ICDevice, didCloseSessionWithError error: Error?) {
        Task { @MainActor in
            isDeviceConnected = false
            statusMessage = error == nil ? "Session closed" : "Session closed with error"
        }
    }
}

