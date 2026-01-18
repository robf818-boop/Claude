import SwiftUI

@main
struct PhotoOrganizerApp: App {
    @StateObject private var importManager = ImportManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(importManager)
        }
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
    }
}
