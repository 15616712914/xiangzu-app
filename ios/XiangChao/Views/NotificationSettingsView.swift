import SwiftUI
import UIKit
import UserNotifications

struct NotificationSettingsView: View {
    @EnvironmentObject private var store: SeasonStore
    @State private var status: UNAuthorizationStatus = .notDetermined

    private var statusText: String {
        switch status {
        case .authorized, .provisional, .ephemeral: return "已开启"
        case .denied: return "已关闭"
        case .notDetermined: return "未请求"
        @unknown default: return "未知"
        }
    }

    private var statusColor: Color {
        switch status {
        case .authorized, .provisional, .ephemeral: return Color(hex: "#45A978")
        case .denied: return Theme.chili
        default: return Theme.gold
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("系统通知权限")
                            .appFont(size: 13, weight: .semibold)
                            .foregroundStyle(Theme.ink)
                        Spacer()
                        HStack(spacing: 5) {
                            Circle()
                                .fill(statusColor)
                                .frame(width: 6, height: 6)
                            Text(statusText)
                                .appFont(size: 11, weight: .semibold)
                                .foregroundStyle(statusColor)
                        }
                    }

                    Text("开赛提醒只在本机生成，不经过服务器。关闭系统通知后，已加入的提醒不会送达。")
                        .appFont(size: 11)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)

                    switch status {
                    case .authorized, .provisional, .ephemeral:
                        NavigationLink(value: Route.reminders) {
                            HStack {
                                Text("查看已加入的提醒")
                                    .appFont(size: 12, weight: .semibold)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .appFont(size: 10, weight: .semibold)
                            }
                            .foregroundStyle(Theme.chili)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.plain)
                    case .denied:
                        Button("去系统设置开启") {
                            openSettings()
                        }
                        .appFont(size: 12, weight: .semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(Theme.chili)
                        .clipShape(Capsule())
                        .buttonStyle(.plain)
                    default:
                        Button("开启通知") {
                            Task {
                                _ = await NotificationManager.shared.requestAuthorization()
                                await refreshStatus()
                            }
                        }
                        .appFont(size: 12, weight: .semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(Theme.chili)
                        .clipShape(Capsule())
                        .buttonStyle(.plain)
                    }
                }
                .card(padding: 16)

                VStack(alignment: .leading, spacing: 0) {
                    NavigationLink(value: Route.reminders) {
                        settingRow(icon: "bell", title: "开赛提醒", subtitle: "比赛前 30 分钟", available: true)
                    }
                    .buttonStyle(.plain)
                    Divider().background(Theme.hairline)
                    settingRow(icon: "flag", title: "赛果提醒", subtitle: "需要服务器推送，后续开放", available: false)
                }
                .padding(.horizontal, 14)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Text("当前只有开赛提醒。赛果推送尚未接入 APNs，不会用本地通知模拟。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)

                #if DEBUG
                Button("发送 5 秒测试通知") {
                    guard let match = store.upcomingMatches.first ?? store.matches.first else { return }
                    Task {
                        _ = await NotificationManager.shared.requestAuthorization()
                        await NotificationManager.shared.scheduleTest(match: match)
                    }
                }
                .appFont(size: 11, weight: .semibold)
                .foregroundStyle(Theme.chili)
                .buttonStyle(.plain)
                #endif
            }
            .padding(18)
            .padding(.bottom, 100)
        }
        .background(Theme.paper)
        .navigationTitle("通知设置")
        .navigationBarTitleDisplayMode(.inline)
        .task { await refreshStatus() }
    }

    private func settingRow(icon: String, title: String, subtitle: String, available: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .appFont(size: 13)
                .foregroundStyle(available ? Theme.ink.opacity(0.55) : Theme.muted.opacity(0.5))
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .appFont(size: 13)
                    .foregroundStyle(available ? Theme.ink : Theme.muted)
                Text(subtitle)
                    .appFont(size: 9)
                    .foregroundStyle(Theme.muted)
            }
            Spacer()
            if available {
                Image(systemName: "chevron.right")
                    .appFont(size: 10, weight: .semibold)
                    .foregroundStyle(Theme.ink.opacity(0.25))
            } else {
                Text("未开放")
                    .appFont(size: 9, weight: .semibold)
                    .foregroundStyle(Theme.muted)
            }
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func refreshStatus() async {
        let settings = await withCheckedContinuation { continuation in
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                continuation.resume(returning: settings)
            }
        }
        status = settings.authorizationStatus
    }

    private func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
