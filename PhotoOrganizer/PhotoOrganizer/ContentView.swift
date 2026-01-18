import SwiftUI

struct ContentView: View {
    @EnvironmentObject var importManager: ImportManager
    @State private var destinationPath: String = ""
    @State private var showingFolderPicker = false
    @State private var organizationRule: OrganizationRule = .yearMonth

    var body: some View {
        VStack(spacing: 20) {
            // Header
            Text("iPhone Photo Organizer")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 30)

            // Device Status
            HStack {
                Circle()
                    .fill(importManager.isDeviceConnected ? Color.green : Color.gray)
                    .frame(width: 12, height: 12)
                Text(importManager.isDeviceConnected ? "iPhone Connected" : "No iPhone Detected")
                    .font(.headline)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)

            Divider()

            // Configuration Section
            VStack(alignment: .leading, spacing: 15) {
                Text("Configuration")
                    .font(.title2)
                    .fontWeight(.semibold)

                // Destination Folder
                VStack(alignment: .leading, spacing: 5) {
                    Text("Destination Folder:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    HStack {
                        Text(destinationPath.isEmpty ? "No folder selected" : destinationPath)
                            .lineLimit(1)
                            .truncationMode(.middle)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(4)

                        Button("Choose...") {
                            selectDestinationFolder()
                        }
                    }
                }

                // Organization Rule
                VStack(alignment: .leading, spacing: 5) {
                    Text("Organization Pattern:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Picker("", selection: $organizationRule) {
                        Text("Year/Month (2024/2024-08 August/)").tag(OrganizationRule.yearMonth)
                        Text("Year/Month/Day (2024/08/15/)").tag(OrganizationRule.yearMonthDay)
                        Text("Year Only (2024/)").tag(OrganizationRule.yearOnly)
                    }
                    .pickerStyle(.radioGroup)
                }

                // Separate Photos/Videos Toggle
                Toggle("Separate Photos and Videos folders", isOn: $importManager.separateMediaTypes)
                    .toggleStyle(.switch)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            // Import Stats
            if importManager.totalImported > 0 || importManager.isImporting {
                VStack(spacing: 10) {
                    Text("Import Progress")
                        .font(.title2)
                        .fontWeight(.semibold)

                    if importManager.isImporting {
                        ProgressView(value: importManager.progress, total: 1.0) {
                            Text("Importing: \(importManager.currentFile)")
                                .font(.caption)
                        }
                        .padding(.horizontal)
                    }

                    HStack(spacing: 30) {
                        VStack {
                            Text("\(importManager.totalImported)")
                                .font(.title)
                                .fontWeight(.bold)
                            Text("Imported")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        VStack {
                            Text("\(importManager.skippedDuplicates)")
                                .font(.title)
                                .fontWeight(.bold)
                            Text("Duplicates Skipped")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        VStack {
                            Text("\(importManager.errors)")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                            Text("Errors")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()

                Divider()
            }

            // Action Buttons
            HStack(spacing: 15) {
                Button(action: {
                    Task {
                        await importManager.startImport(
                            destinationPath: destinationPath,
                            organizationRule: organizationRule
                        )
                    }
                }) {
                    Label(importManager.isImporting ? "Importing..." : "Start Import", systemImage: "arrow.down.circle.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canStartImport ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .disabled(!canStartImport || importManager.isImporting)

                if importManager.isImporting {
                    Button(action: {
                        importManager.cancelImport()
                    }) {
                        Label("Cancel", systemImage: "xmark.circle.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal)

            Spacer()

            // Status Messages
            if !importManager.statusMessage.isEmpty {
                Text(importManager.statusMessage)
                    .font(.caption)
                    .foregroundColor(importManager.hasError ? .red : .secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.gray.opacity(0.1))
            }
        }
        .padding()
        .frame(minWidth: 600, minHeight: 600)
        .onAppear {
            importManager.startDeviceMonitoring()
        }
    }

    private var canStartImport: Bool {
        importManager.isDeviceConnected && !destinationPath.isEmpty
    }

    private func selectDestinationFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Select Destination"

        if panel.runModal() == .OK {
            if let url = panel.url {
                destinationPath = url.path
            }
        }
    }
}

enum OrganizationRule: String, Codable {
    case yearMonth = "year_month"
    case yearMonthDay = "year_month_day"
    case yearOnly = "year_only"

    func formatPath(for date: Date, mediaType: MediaType, separateTypes: Bool) -> String {
        let calendar = Calendar.current
        let year = calendar.component(.year, from: date)
        let month = calendar.component(.month, from: date)
        let day = calendar.component(.day, from: date)

        let monthName = DateFormatter().monthSymbols[month - 1]

        var basePath = ""
        if separateTypes {
            basePath = mediaType == .photo ? "Photos/" : "Videos/"
        }

        switch self {
        case .yearMonth:
            return "\(basePath)\(year)/\(year)-\(String(format: "%02d", month)) \(monthName)/"
        case .yearMonthDay:
            return "\(basePath)\(year)/\(String(format: "%02d", month))/\(String(format: "%02d", day))/"
        case .yearOnly:
            return "\(basePath)\(year)/"
        }
    }
}

enum MediaType {
    case photo
    case video
}
