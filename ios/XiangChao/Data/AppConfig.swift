import Foundation
import UIKit

enum AppConfig {
    static let apiBaseURL: URL = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "XCApiBaseURL") as? String ?? ""
        return URL(string: raw) ?? URL(string: "http://127.0.0.1:8787")!
    }()

    static var isLocalAPI: Bool {
        apiBaseURL.host == "127.0.0.1" || apiBaseURL.host == "localhost"
    }

    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }
}


@MainActor
enum AppWindowStyle {
    static func set(_ style: UIUserInterfaceStyle) {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                window.overrideUserInterfaceStyle = style
            }
        }
    }
}
