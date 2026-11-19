import Foundation
import UserNotifications

@MainActor
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    /// Set when the user taps a reminder; RootView consumes it and opens the match.
    @Published var pendingMatchId: String?

    private let center = UNUserNotificationCenter.current()
    private nonisolated static let identifierPrefix = "xiangchao.match."

    private override init() {
        super.init()
    }

    func activate() {
        center.delegate = self
    }

    nonisolated static func matchId(from userInfo: [AnyHashable: Any]) -> String? {
        userInfo["matchId"] as? String
    }

    nonisolated static func matchId(fromIdentifier identifier: String) -> String? {
        guard identifier.hasPrefix(identifierPrefix) else { return nil }
        return String(identifier.dropFirst(identifierPrefix.count))
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let request = response.notification.request
        let matchId = Self.matchId(from: request.content.userInfo)
            ?? Self.matchId(fromIdentifier: request.identifier)
        Task { @MainActor in
            self.pendingMatchId = matchId
            completionHandler()
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .list])
    }

    func requestAuthorization() async -> Bool {
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    func schedule(match: Match) async {
        guard let kickoff = League.kickoffDate(match) else { return }
        let fireDate = kickoff.addingTimeInterval(-30 * 60)
        let interval = fireDate.timeIntervalSinceNow
        guard interval > 1 else { return }

        let home = TeamInfo.map[match.home]?.city ?? match.home
        let away = TeamInfo.map[match.away]?.city ?? match.away

        let content = UNMutableNotificationContent()
        content.title = "\(home) vs \(away) 即将开赛"
        content.body = "\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)"
        content.sound = .default
        content.userInfo = ["matchId": match.id]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(
            identifier: Self.identifierPrefix + match.id,
            content: content,
            trigger: trigger
        )
        try? await center.add(request)
    }

    func cancel(matchId: String) {
        let identifier = Self.identifierPrefix + matchId
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        center.removeDeliveredNotifications(withIdentifiers: [identifier])
    }

    #if DEBUG
    /// QA only: fires in a few seconds so the tap-to-open flow can be checked on a simulator.
    func scheduleTest(match: Match, after seconds: TimeInterval = 5) async {
        let content = UNMutableNotificationContent()
        content.title = "测试提醒 · \(TeamInfo.map[match.home]?.city ?? match.home) vs \(TeamInfo.map[match.away]?.city ?? match.away)"
        content.body = "点击这条通知应打开比赛详情"
        content.sound = .default
        content.userInfo = ["matchId": match.id]
        let request = UNNotificationRequest(
            identifier: Self.identifierPrefix + match.id + ".test",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
        )
        try? await center.add(request)
    }
    #endif

    func reschedule(matches: [Match]) async {
        for match in matches {
            await schedule(match: match)
        }
    }
}
