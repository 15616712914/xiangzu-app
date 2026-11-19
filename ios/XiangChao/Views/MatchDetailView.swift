import SwiftUI

struct MatchDetailView: View {
    @EnvironmentObject private var store: SeasonStore
    @EnvironmentObject private var fan: FanStore
    let matchId: String

    @State private var tab: DetailTab = .prediction
    @State private var lineupTeam = ""

    private enum DetailTab: String, CaseIterable {
        case prediction = "预测"
        case lineup = "名单"
    }

    var body: some View {
        Group {
            if let match = store.match(id: matchId) {
                content(match)
            } else {
                ContentUnavailableView("比赛不存在", systemImage: "questionmark.circle")
            }
        }
    }

    private func content(_ match: Match) -> some View {
        let home = TeamInfo.map[match.home] ?? TeamInfo.all[0]
        let away = TeamInfo.map[match.away] ?? TeamInfo.all[0]

        return ScrollView {
            VStack(spacing: 0) {
                hero(match, home: home, away: away)

                VStack(alignment: .leading, spacing: 16) {
                    infoCard(match, home: home)

                    VoteCard(match: match, showsDetailLink: false)

                    HStack(spacing: 24) {
                        ForEach(DetailTab.allCases, id: \.self) { item in
                            Button {
                                tab = item
                            } label: {
                                VStack(spacing: 5) {
                                    Text(item.rawValue)
                                        .appFont(size: 14, weight: tab == item ? .bold : .medium)
                                        .foregroundStyle(tab == item ? Theme.ink : Theme.muted)
                                    Rectangle()
                                        .fill(tab == item ? Theme.chili : Color.clear)
                                        .frame(height: 2)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        Spacer()
                    }

                    if tab == .prediction {
                        PredictionPanel(
                            match: match,
                            prediction: store.prediction(
                                for: match,
                                liveMinute: match.isLive ? match.liveMinute : nil
                            )
                        )
                    } else {
                        LineupPanel(match: match, teamId: $lineupTeam)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 110)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.paper)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(.top, -22)
            }
        }
        .background(Theme.paper)
        .navigationTitle(League.stageLabel(match))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.ink, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .onAppear {
            if lineupTeam.isEmpty { lineupTeam = match.home }
            AppWindowStyle.set(.dark)
            Analytics.track(.matchOpened, properties: ["match": match.id])
        }
    }

    private func hero(_ match: Match, home: TeamInfo, away: TeamInfo) -> some View {
        ZStack {
            Theme.ink
            RadialGradient(
                colors: [home.color.opacity(0.5), .clear],
                center: .leading,
                startRadius: 10,
                endRadius: 240
            )
            RadialGradient(
                colors: [away.color.opacity(0.5), .clear],
                center: .trailing,
                startRadius: 10,
                endRadius: 240
            )
            StripeTexture(opacity: 0.6)

            VStack(spacing: 14) {
                Text("\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                    .appFont(size: 11, weight: .semibold, design: .rounded)
                    .foregroundStyle(.white.opacity(0.55))

                HStack(spacing: 8) {
                    teamColumn(home, side: "主场")

                    Spacer(minLength: 4)

                    VStack(spacing: 5) {
                        if match.status == .upcoming {
                            Text("VS")
                                .font(.score(38))
                                .foregroundStyle(.white)
                        } else {
                            Text("\(match.homeGoals) : \(match.awayGoals)")
                                .font(.score(42))
                                .foregroundStyle(.white)
                        }

                        if let penalty = match.penalty, penalty.count == 2 {
                            Text("点球 \(penalty[0]):\(penalty[1])")
                                .appFont(size: 10, weight: .bold)
                                .foregroundStyle(Theme.gold)
                        } else if match.isLive, let minute = match.liveMinute {
                            Text("\(minute)' 进行中")
                                .appFont(size: 10, weight: .semibold)
                                .foregroundStyle(Theme.gold)
                        } else {
                            Text(match.stateLabel)
                                .appFont(size: 10)
                                .foregroundStyle(.white.opacity(0.45))
                        }
                    }
                    .frame(width: 110)

                    Spacer(minLength: 4)

                    teamColumn(away, side: "客场")
                }

                if match.isLive, let minute = match.liveMinute {
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.12))
                            Capsule()
                                .fill(Theme.gold)
                                .frame(width: geometry.size.width * CGFloat(minute) / 90)
                        }
                    }
                    .frame(height: 3)
                    .padding(.horizontal, 20)
                }

                HStack(spacing: 5) {
                    Image(systemName: "mappin.and.ellipse")
                    Text(match.venue(or: home.stadium))
                        .lineLimit(1)
                    if let attendance = match.attendance, attendance > 0 {
                        Text("· 现场 \(attendance) 人")
                            .lineLimit(1)
                    }
                }
                .appFont(size: 10)
                .foregroundStyle(.white.opacity(0.5))

                HStack(spacing: 10) {
                    if match.status == .upcoming {
                        Button {
                            Task { await store.toggleReminder(match) }
                        } label: {
                            Label(
                                store.reminders.contains(match.id) ? "已加入提醒" : "加入提醒",
                                systemImage: store.reminders.contains(match.id) ? "bell.fill" : "bell"
                            )
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(store.reminders.contains(match.id) ? Theme.ink : .white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(store.reminders.contains(match.id) ? Color.white.opacity(0.9) : Theme.chili)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }

                    NavigationLink(value: Route.poster(match.id)) {
                        Label("生成海报", systemImage: "square.and.arrow.up")
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(.white.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 2)
            }
            .padding(.horizontal, 20)
            .padding(.top, 18)
            .padding(.bottom, 34)
        }
    }

    private func teamColumn(_ team: TeamInfo, side: String) -> some View {
        NavigationLink(value: Route.team(team.id)) {
            VStack(spacing: 7) {
                CrestView(team: team, size: 62)
                Text(team.city)
                    .appFont(size: 14, weight: .bold)
                    .foregroundStyle(.white)
                Text(side)
                    .appFont(size: 9)
                    .foregroundStyle(.white.opacity(0.4))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private func infoCard(_ match: Match, home: TeamInfo) -> some View {
        VStack(spacing: 9) {
            infoRow("赛事", "2026 \(Brand.league) · \(match.phase == .knockout ? (match.stage ?? "淘汰赛") : "第\(match.round)轮")")
            infoRow("开球", "\(League.formatDate(match.date)) \(match.time)")
            infoRow("场地", match.venue(or: home.stadium))
            if match.status != .upcoming {
                Text("官方未公布逐场进球事件与技术统计。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 2)
            }
        }
        .card()
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .appFont(size: 11)
                .foregroundStyle(Theme.muted)
                .frame(width: 34, alignment: .leading)
            Text(value)
                .appFont(size: 12, weight: .medium)
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct PredictionPanel: View {
    let match: Match
    let prediction: Prediction

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("数据模型")
                        .font(.display(20))
                        .foregroundStyle(Theme.ink)
                    Text("本地泊松推演 · 不联网")
                        .appFont(size: 9)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                ConfidenceBadge(text: prediction.confidence)
            }

            Text(prediction.summary)
                .appFont(size: 13)
                .foregroundStyle(Theme.ink.opacity(0.72))
                .lineSpacing(4)

            HStack(spacing: 12) {
                CrestView(team: home, size: 34)
                VStack(alignment: .leading, spacing: 1) {
                    Text("预测比分")
                        .appFont(size: 9)
                        .foregroundStyle(Theme.muted)
                    Text("\(prediction.predicted.0) : \(prediction.predicted.1)")
                        .font(.number(28))
                        .foregroundStyle(Theme.ink)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("样本")
                        .appFont(size: 9)
                        .foregroundStyle(Theme.muted)
                    Text("\(prediction.sample) 场")
                        .appFont(size: 13, weight: .semibold)
                        .foregroundStyle(Theme.ink)
                }
                CrestView(team: away, size: 34)
            }
            .padding(12)
            .background(Theme.paper.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(spacing: 8) {
                ProbabilityBar(
                    probs: prediction.probs,
                    homeColor: home.color,
                    awayColor: away.color,
                    height: 9
                )

                HStack {
                    probabilityLabel(home.city + "胜", prediction.probs[.home] ?? 0, home.color)
                    Spacer()
                    probabilityLabel("平局", prediction.probs[.draw] ?? 0, Theme.muted)
                    Spacer()
                    probabilityLabel(away.city + "胜", prediction.probs[.away] ?? 0, away.color)
                }
            }

            HStack(spacing: 10) {
                metric("预期进球", String(format: "%.1f - %.1f", prediction.xg.0, prediction.xg.1))
                metric("大 2.5", "\(Int((prediction.over25 * 100).rounded()))%")
                metric("双方进球", "\(Int((prediction.btts * 100).rounded()))%")
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("可能比分")
                    .appFont(size: 11, weight: .semibold)
                    .foregroundStyle(Theme.muted)

                HStack(spacing: 8) {
                    ForEach(Array(prediction.likely.enumerated()), id: \.offset) { _, item in
                        VStack(spacing: 2) {
                            Text("\(item.score.0) : \(item.score.1)")
                                .font(.number(15))
                                .foregroundStyle(Theme.ink)
                            Text("\(Int((item.probability * 100).rounded()))%")
                                .appFont(size: 9)
                                .foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Theme.paper.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }

            VStack(alignment: .leading, spacing: 7) {
                Text("模型依据")
                    .appFont(size: 11, weight: .semibold)
                    .foregroundStyle(Theme.muted)

                ForEach(prediction.factors, id: \.self) { factor in
                    HStack(alignment: .top, spacing: 7) {
                        Circle()
                            .fill(Theme.gold)
                            .frame(width: 4, height: 4)
                            .padding(.top, 6)
                        Text(factor)
                            .appFont(size: 11)
                            .foregroundStyle(Theme.ink.opacity(0.7))
                    }
                }
            }

            Text("本地模型推演，仅供娱乐，不构成投注建议。")
                .appFont(size: 10)
                .foregroundStyle(Theme.muted)
        }
        .card(padding: 16)
    }

    private func probabilityLabel(_ title: String, _ value: Double, _ color: Color) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text("\(title) \(Int((value * 100).rounded()))%")
                .appFont(size: 9, weight: .medium)
                .foregroundStyle(Theme.muted)
        }
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(spacing: 3) {
            Text(title)
                .appFont(size: 9)
                .foregroundStyle(Theme.muted)
            Text(value)
                .appFont(size: 12, weight: .bold, design: .rounded)
                .foregroundStyle(Theme.ink)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(Theme.paper.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct LineupPanel: View {
    @EnvironmentObject private var store: SeasonStore
    let match: Match
    @Binding var teamId: String

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("球队", selection: $teamId) {
                Text(home.city).tag(home.id)
                Text(away.city).tag(away.id)
            }
            .pickerStyle(.segmented)

            Text("官方未公布首发，以下为 2026 赛季报名名单。")
                .appFont(size: 10)
                .foregroundStyle(Theme.muted)

            let players = (store.playersByTeam[teamId] ?? [])
                .sorted { $0.number < $1.number }

            VStack(spacing: 0) {
                ForEach(Array(players.enumerated()), id: \.element.id) { index, player in
                    NavigationLink(value: Route.player(player.id)) {
                        HStack(spacing: 12) {
                            Text("\(player.number)")
                                .font(.number(13))
                                .foregroundStyle(Theme.muted)
                                .frame(width: 26, alignment: .trailing)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(player.name)
                                    .appFont(size: 14, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                                Text(player.position?.isEmpty == false ? (player.position ?? "") : "位置未公布")
                                    .appFont(size: 10)
                                    .foregroundStyle(Theme.muted)
                            }

                            Spacer()

                            Text("\(player.goalCount) 球")
                                .appFont(size: 11)
                                .foregroundStyle(Theme.ink.opacity(0.7))

                            Image(systemName: "chevron.right")
                                .appFont(size: 10, weight: .semibold)
                                .foregroundStyle(Theme.ink.opacity(0.2))
                        }
                        .padding(.vertical, 8)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    if index < players.count - 1 {
                        Divider().background(Theme.hairline)
                    }
                }
            }
            .card(padding: 12)
        }
    }
}
