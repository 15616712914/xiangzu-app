import SwiftUI

struct VoteCard: View {
    @EnvironmentObject private var fan: FanStore
    let match: Match
    var compact = false
    var showsDetailLink = true
    var showsLoginPrompt = true

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }
    private var summary: VoteSummary? { fan.summary(for: match.id) }
    private var locked: Bool { match.status != .upcoming || (summary?.locked ?? false) }
    private var mine: VoteChoice? { summary?.mine ?? fan.vote(for: match.id) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("你看好谁")
                    .appFont(size: compact ? 14 : 16, weight: .bold)
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text("\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                    .appFont(size: 9, weight: .medium)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Text("\(home.city) vs \(away.city)")
                .appFont(size: 10, weight: .semibold)
                .foregroundStyle(Theme.muted)

            if !fan.isLoggedIn && !locked && showsLoginPrompt {
                HStack(spacing: 10) {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                        .appFont(size: 18)
                        .foregroundStyle(Theme.gold)
                    Text("登录后参与投票，赛后进入预测排行榜")
                        .appFont(size: 11)
                        .foregroundStyle(Theme.muted)
                    Spacer()
                    Button("登录") { fan.showLogin = true }
                        .appFont(size: 11, weight: .semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Theme.chili)
                        .clipShape(Capsule())
                        .buttonStyle(.plain)
                }
            } else if !locked && mine == nil {
                VStack(spacing: 6) {
                    HStack(spacing: 8) {
                        ForEach(VoteChoice.allCases, id: \.self) { choice in
                            Button {
                                Task { await fan.vote(matchId: match.id, choice: choice) }
                            } label: {
                                Text(label(for: choice))
                                    .appFont(size: 11, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity, minHeight: 44)
                                    .background(Theme.paper)
                                    .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .disabled(fan.busy)
                        }
                    }
                    if !fan.isLoggedIn && !compact {
                        Text("登录后计入积分")
                            .appFont(size: 9)
                            .foregroundStyle(Theme.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }

            if let summary, (mine != nil || locked) {
                results(summary)
            }

            if let mine, let outcome = match.resultChoice {
                resultFeedback(mine: mine, outcome: outcome)
            } else if locked {
                Text(match.isFinished ? "本场已结束，你没有参与这场投票。" : "投票已截止，等待官方赛果。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
            } else if !compact {
                Text("赛后按猜中的胜平负累计积分，积分只用于排行榜。")
                    .appFont(size: 9)
                    .foregroundStyle(Theme.muted)
            }

            if let error = fan.errorMessage {
                Text(error)
                    .appFont(size: 9)
                    .foregroundStyle(Theme.chili)
            }

            if showsDetailLink {
                NavigationLink(value: Route.match(match.id)) {
                    HStack(spacing: 4) {
                        Text("查看比赛详情")
                        Image(systemName: "chevron.right")
                            .appFont(size: 8, weight: .bold)
                    }
                    .appFont(size: 9, weight: .semibold)
                    .foregroundStyle(Theme.chili)
                }
                .buttonStyle(.plain)
            }
        }
        .card(padding: compact ? 12 : 16)
        .task(id: match.id) {
            await fan.loadVote(matchId: match.id)
        }
    }

    private func results(_ summary: VoteSummary) -> some View {
        VStack(spacing: 7) {
            ProbabilityBar(
                probs: [
                    .home: summary.counts.share(for: .home),
                    .draw: summary.counts.share(for: .draw),
                    .away: summary.counts.share(for: .away),
                ],
                homeColor: home.color,
                awayColor: away.color,
                height: 7
            )

            HStack {
                resultLabel(home.city + "胜", summary.counts, color: home.color, choice: .home)
                Spacer()
                resultLabel("平局", summary.counts, color: Theme.muted, choice: .draw)
                Spacer()
                resultLabel(away.city + "胜", summary.counts, color: away.color, choice: .away)
            }

            Text(summary.counts.total > 0 ? "\(summary.counts.total) 人参与" : "还没有人投票")
                .appFont(size: 9)
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func resultFeedback(mine: VoteChoice, outcome: VoteChoice) -> some View {
        let correct = mine == outcome
        return HStack(spacing: 7) {
            Image(systemName: correct ? "checkmark.seal.fill" : "xmark.circle.fill")
            Text(correct ? "猜中了 · +10 分" : "未猜中 · 本场\(label(for: outcome))")
                .fontWeight(.semibold)
            Spacer()
            Text("你选的是\(label(for: mine))")
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .appFont(size: 10)
        .foregroundStyle(correct ? Color(hex: "#2F7D57") : Theme.muted)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background((correct ? Color(hex: "#45A978") : Theme.muted).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
    }

    private func resultLabel(
        _ title: String,
        _ counts: VoteCounts,
        color: Color,
        choice: VoteChoice
    ) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(title)
                .foregroundStyle(mine == choice ? Theme.ink : Theme.muted)
                .fontWeight(mine == choice ? .bold : .regular)
            Text("\(Int((counts.share(for: choice) * 100).rounded()))%")
                .foregroundStyle(Theme.muted)
        }
        .appFont(size: 9)
    }

    private func label(for choice: VoteChoice) -> String {
        switch choice {
        case .home: return "\(home.city)胜"
        case .draw: return "平局"
        case .away: return "\(away.city)胜"
        }
    }
}
