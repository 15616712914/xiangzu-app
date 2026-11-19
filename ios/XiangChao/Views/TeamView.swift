import SwiftUI

struct TeamView: View {
    @EnvironmentObject private var store: SeasonStore
    let teamId: String

    @State private var tab: Tab = .schedule

    private enum Tab: String, CaseIterable {
        case schedule = "赛程"
        case squad = "阵容"
    }

    private var team: TeamInfo? { TeamInfo.map[teamId] }
    private var row: StandingRow? { store.standings.first { $0.teamId == teamId } }

    var body: some View {
        Group {
            if let team, let row {
                content(team, row: row)
            } else {
                ContentUnavailableView("球队不存在", systemImage: "questionmark.circle")
            }
        }
    }

    private func content(_ team: TeamInfo, row: StandingRow) -> some View {
        let rank = (store.standings.firstIndex { $0.teamId == teamId } ?? 0) + 1
        let isFav = store.favTeam == teamId
        let allMatches = store.matches.filter { $0.home == teamId || $0.away == teamId }
        let upcoming = allMatches
            .filter { $0.status != .finished }
            .sorted { $0.date == $1.date ? $0.time < $1.time : $0.date < $1.date }
        let finished = allMatches
            .filter { $0.status == .finished }
            .sorted { $0.date == $1.date ? $0.time > $1.time : $0.date > $1.date }

        return ScrollView {
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("\(team.alias) · \(Brand.league)")
                        .appFont(size: 10, weight: .bold, design: .rounded)
                        .tracking(1.4)
                        .foregroundStyle(.white.opacity(0.6))

                    HStack(spacing: 14) {
                        CrestView(team: team, size: 74)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(team.city)队")
                                .font(.display(28))
                                .foregroundStyle(.white)
                            Text("2026 \(Brand.league) · 常规赛第 \(rank) 名")
                                .appFont(size: 12)
                                .foregroundStyle(.white.opacity(0.65))
                        }
                        Spacer()
                    }

                    HStack(spacing: 8) {
                        stat("排名", "#\(rank)")
                        stat("积分", "\(row.points)")
                        stat("战绩", "\(row.won)-\(row.drawn)-\(row.lost)")
                        stat("进球", "\(row.gf)")
                    }

                    Button {
                        store.favTeam = isFav ? nil : teamId
                    } label: {
                        Label(isFav ? "已设为我的主队" : "设为我的主队", systemImage: isFav ? "heart.fill" : "heart")
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(.white.opacity(0.92))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Text(team.slogan)
                        .appFont(size: 11)
                        .foregroundStyle(.white.opacity(0.5))
                }
                .padding(20)
                .padding(.top, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    ZStack {
                        Theme.ink
                        RadialGradient(
                            colors: [team.color.opacity(0.55), .clear],
                            center: .topLeading,
                            startRadius: 20,
                            endRadius: 420
                        )
                        RadialGradient(
                            colors: [team.color.opacity(0.22), .clear],
                            center: .bottomTrailing,
                            startRadius: 0,
                            endRadius: 320
                        )
                        StripeTexture(opacity: 0.6)
                    }
                )

                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        infoLine("主场", team.stadium)
                        infoLine("赛季", "2026 \(Brand.league) · \(row.played) 场 \(row.won) 胜 \(row.drawn) 平 \(row.lost) 负")
                    }
                    .card(padding: 14)

                    HStack(spacing: 22) {
                        ForEach(Tab.allCases, id: \.self) { item in
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

                    if tab == .schedule {
                        VStack(alignment: .leading, spacing: 10) {
                            if !upcoming.isEmpty {
                                Text("接下来")
                                    .appFont(size: 11, weight: .bold)
                                    .foregroundStyle(Theme.muted)
                                matchList(upcoming)
                            }

                            if !finished.isEmpty {
                                Text("近期赛果")
                                    .appFont(size: 11, weight: .bold)
                                    .foregroundStyle(Theme.muted)
                                    .padding(.top, upcoming.isEmpty ? 0 : 4)
                                matchList(finished)
                            }

                            if upcoming.isEmpty && finished.isEmpty {
                                Text("暂无比赛记录")
                                    .appFont(size: 11)
                                    .foregroundStyle(Theme.muted)
                                    .card(padding: 12)
                            }
                        }
                    } else {
                        squad
                    }
                }
                .padding(18)
                .padding(.bottom, 100)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.paper)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(.top, -20)
            }
        }
        .background(Theme.paper)
        .navigationTitle("\(team.city)队")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.ink, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.number(19))
                .foregroundStyle(.white)
            Text(label)
                .appFont(size: 9)
                .foregroundStyle(.white.opacity(0.55))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func infoLine(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .appFont(size: 11)
                .foregroundStyle(Theme.muted)
                .frame(width: 30, alignment: .leading)
            Text(value)
                .appFont(size: 12, weight: .medium)
                .foregroundStyle(Theme.ink)
            Spacer(minLength: 0)
        }
    }

    private func matchList(_ list: [Match]) -> some View {
        VStack(spacing: 0) {
            ForEach(list) { match in
                MatchRow(match: match, showStage: true)
                if match.id != list.last?.id {
                    Divider().background(Theme.hairline)
                }
            }
        }
        .padding(.horizontal, 12)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var squad: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("2026 赛季报名名单 · \(store.playersByTeam[teamId]?.count ?? 0) 人")
                .appFont(size: 10)
                .foregroundStyle(Theme.muted)

            VStack(spacing: 0) {
                let players = (store.playersByTeam[teamId] ?? []).sorted { $0.number < $1.number }
                ForEach(players) { player in
                    NavigationLink(value: Route.player(player.id)) {
                        HStack(spacing: 12) {
                            Text("\(player.number)")
                                .font(.number(13))
                                .foregroundStyle(Theme.muted)
                                .frame(width: 26, alignment: .trailing)
                            Text(player.name)
                                .appFont(size: 14, weight: .semibold)
                                .foregroundStyle(Theme.ink)
                            Spacer()
                            Text("\(player.goalCount) 球")
                                .appFont(size: 10)
                                .foregroundStyle(Theme.muted)
                            Image(systemName: "chevron.right")
                                .appFont(size: 10, weight: .semibold)
                                .foregroundStyle(Theme.ink.opacity(0.2))
                        }
                        .padding(.vertical, 9)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if player.id != players.last?.id {
                        Divider().background(Theme.hairline)
                    }
                }
            }
            .padding(.horizontal, 12)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }
}
