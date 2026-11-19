import SwiftUI

struct BracketView: View {
    @EnvironmentObject private var store: SeasonStore
    var asTab = false
    @State private var stage: Stage = .quarter

    private enum Stage: String, CaseIterable {
        case quarter = "1/4 决赛"
        case semi = "半决赛"
        case final = "决赛"
    }

    private var quarterFinals: [Tie] { Tie.stageTies(matches: store.matches, firstRound: 14, secondRound: 15) }
    private var semiFinals: [Tie] { Tie.stageTies(matches: store.matches, firstRound: 16, secondRound: 17) }

    var body: some View {
        Group {
            if asTab {
                VStack(spacing: 0) {
                    PageHero(
                        kicker: "Knockout",
                        title: "对阵",
                        subtitle: "淘汰赛两回合 · 决赛单场"
                    )

                    ScrollView { content }
                        .background(Theme.paper)
                        .clipShape(
                            UnevenRoundedRectangle(
                                topLeadingRadius: 28,
                                bottomLeadingRadius: 0,
                                bottomTrailingRadius: 0,
                                topTrailingRadius: 28,
                                style: .continuous
                            )
                        )
                        .padding(.top, -22)
                }
                .background(Theme.paper)
                .toolbar(.hidden, for: .navigationBar)
            } else {
                ScrollView { content }
                    .background(Theme.paper)
                    .navigationTitle("淘汰赛对阵")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar(.hidden, for: .tabBar)
            }
        }
        .animation(.easeInOut(duration: 0.18), value: stage)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("1/4 决赛与半决赛主客场两回合，决赛单场决胜。总比分打平直接点球决胜。")
                .appFont(size: 12)
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)
                .card(padding: 14)

            SegmentedPill(items: Stage.allCases, title: { $0.rawValue }, selection: $stage)

            switch stage {
            case .quarter:
                ties(quarterFinals, empty: "1/4 决赛尚未开始")
            case .semi:
                ties(semiFinals, empty: "半决赛对阵待 1/4 决赛结束")
            case .final:
                finalCard
            }

            Text("半决赛：11月21/22日首回合，11月28/29日次回合；决赛 12月5日 19:38。")
                .appFont(size: 10)
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
        }
        .padding(18)
        .padding(.bottom, 100)
    }

    private func ties(_ list: [Tie], empty: String) -> some View {
        VStack(spacing: 10) {
            if list.isEmpty {
                Text(empty)
                    .appFont(size: 11)
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card(padding: 14)
            } else {
                ForEach(list) { tie in
                    TieCard(tie: tie)
                }
            }
        }
    }

    private var finalCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "trophy.fill")
                .appFont(size: 32)
                .foregroundStyle(Theme.gold)
            Text("2026 \(Brand.league)决赛")
                .font(.display(22))
                .foregroundStyle(Theme.ink)
            Text("12月5日 19:38")
                .font(.number(18))
                .foregroundStyle(Theme.ink)
            Text("对阵双方待半决赛产生")
                .appFont(size: 11)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .background(
            LinearGradient(
                colors: [Color.white, Theme.gold.opacity(0.12)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct TieCard: View {
    let tie: Tie

    private var played: Bool { tie.legs.contains { $0.status == .finished } }

    var body: some View {
        VStack(spacing: 9) {
            HStack {
                Text(tie.legs.first.map { League.stageLabel($0) } ?? "淘汰赛")
                    .appFont(size: 9, weight: .bold, design: .rounded)
                    .tracking(0.8)
                    .foregroundStyle(Theme.gold)
                Spacer()
                if tied {
                    Text("总比分 \(tie.aggHome):\(tie.aggAway)")
                        .appFont(size: 9)
                        .foregroundStyle(Theme.muted)
                }
            }

            ForEach([tie.home, tie.away], id: \.self) { id in
                let team = TeamInfo.map[id] ?? TeamInfo.all[0]
                let goals = id == tie.home ? tie.aggHome : tie.aggAway
                let lost = tie.winner != nil && tie.winner != id
                let pen = id == tie.home ? tie.penHome : tie.penAway

                NavigationLink(value: Route.team(id)) {
                    HStack(spacing: 10) {
                        CrestView(team: team, size: 26)
                        Text(team.city)
                            .appFont(size: 14, weight: tie.winner == id ? .bold : .semibold)
                            .foregroundStyle(Theme.ink.opacity(lost ? 0.42 : 1))
                        Spacer()
                        Text(played ? "\(goals)\(pen.map { " (\($0))" } ?? "")" : "–")
                            .font(.number(16))
                            .foregroundStyle(tie.winner == id ? Theme.chili : Theme.ink)
                    }
                }
                .buttonStyle(.plain)
            }

            if let penHome = tie.penHome, let penAway = tie.penAway, let winner = tie.winner {
                HStack(spacing: 5) {
                    Image(systemName: "checkmark.seal.fill")
                    Text("点球 \(penHome)-\(penAway)，\(TeamInfo.map[winner]?.city ?? winner)晋级")
                }
                .appFont(size: 9, weight: .semibold)
                .foregroundStyle(Theme.chili)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(tie.legs.enumerated()), id: \.element.id) { index, leg in
                    NavigationLink(value: Route.match(leg.id)) {
                        HStack {
                            Text("\(index == 0 ? "首回合" : "次回合") \(League.formatDate(leg.date)) \(leg.time)")
                                .foregroundStyle(Theme.muted)
                            Spacer()
                            if leg.status == .finished {
                                Text("\(leg.homeGoals)-\(leg.awayGoals)")
                                    .foregroundStyle(Theme.ink.opacity(0.75))
                            } else {
                                Text(leg.stateLabel)
                                    .foregroundStyle(Theme.muted)
                            }
                        }
                        .appFont(size: 9)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 2)
        }
        .card(padding: 14)
    }

    private var tied: Bool {
        tie.legs.count > 1 && played
    }
}
