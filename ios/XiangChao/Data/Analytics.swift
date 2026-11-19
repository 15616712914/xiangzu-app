import Foundation
import os

enum AnalyticsEvent: String {
    case onboardingComplete = "onboarding_complete"
    case reminderAdded = "reminder_added"
    case reminderRemoved = "reminder_removed"
    case vote = "vote"
    case cheer = "cheer"
    case matchOpened = "match_opened"
    case sharePoster = "share_poster"
}

enum Analytics {
    private static let logger = Logger(subsystem: "com.xiangchao.app", category: "analytics")

    static func track(_ event: AnalyticsEvent, properties: [String: String] = [:]) {
        // Privacy: no account ID, device ID or free text. Attach a remote sink later.
        let detail = properties
            .sorted { $0.key < $1.key }
            .map { "\($0.key)=\($0.value)" }
            .joined(separator: " ")
        #if DEBUG
        logger.debug("\(event.rawValue, privacy: .public) \(detail, privacy: .public)")
        #endif
    }
}
