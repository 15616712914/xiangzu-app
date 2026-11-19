import SwiftUI

struct MatchRow: View {
    let match: Match
    var showStage = false

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        NavigationLink(value: Route.match(match.id)) {
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        if match.status == .live {
                            Circle().fill(Theme.chili).frame(width: 5, height: 5)
                        }
                        Text(leftLabel)
                            .appFont(size: showStage ? 9 : 11, weight: .semibold, design: .rounded)
                            .foregroundStyle(match.status == .live ? Theme.chili : Theme.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    if showStage {
                        Text(League.stageLabel(match))
                            .appFont(size: 9)
                            .foregroundStyle(Theme.muted.opacity(0.8))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
                .frame(width: 62, alignment: .leading)

                HStack(spacing: 6) {
                    Text(home.city)
                        .appFont(size: 14, weight: .semibold)
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    CrestView(team: home, size: 24)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)

                Text(scoreText)
                    .font(.number(15))
                    .foregroundStyle(match.status == .upcoming ? Theme.muted : Theme.ink)
                    .frame(width: 48)

                HStack(spacing: 6) {
                    CrestView(team: away, size: 24)
                    Text(away.city)
                        .appFont(size: 14, weight: .semibold)
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var leftLabel: String {
        guard showStage else { return match.rowTimeLabel }
        return match.isUpcoming ? "\(match.shortDate) \(match.time)" : match.shortDate
    }

    private var scoreText: String {
        if match.status == .upcoming { return "VS" }
        return "\(match.homeGoals):\(match.awayGoals)"
    }
}

struct FormDots: View {
    let form: [String]

    var body: some View {
        HStack(spacing: 3) {
            ForEach(Array(form.enumerated()), id: \.offset) { _, item in
                Circle()
                    .fill(color(for: item))
                    .frame(width: 5, height: 5)
            }
        }
    }

    private func color(for item: String) -> Color {
        switch item {
        case "W": return Color(hex: "#10B981")
        case "L": return Theme.chili
        default: return Theme.ink.opacity(0.2)
        }
    }
}
