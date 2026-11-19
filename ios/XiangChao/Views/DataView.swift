import SwiftUI

struct DataView: View {
    @EnvironmentObject private var store: SeasonStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var segment: Segment = .table

    private enum Segment: String, CaseIterable {
        case table = "积分榜"
        case scorers = "射手榜"
        case teams = "球队"
    }

    var body: some View {
        VStack(spacing: 0) {
            PageHero(
                kicker: "Standings & Stats",
                title: "数据",
                subtitle: "2026 赛季 · 常规赛与淘汰赛"
            ) {
                SegmentedPill(
                    items: Segment.allCases,
                    title: { $0.rawValue },
                    selection: $segment,
                    style: .dark
                )
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    switch segment {
                    case .table:
                        standings
                    case .scorers:
                        scorers
                    case .teams:
                        teams
                    }

                    VStack(spacing: 2) {
                        Text("数据来源：足球中国 / 湖南省足球联赛")
                        HStack(spacing: 4) {
                            Circle()
                                .fill(store.usingBundledData ? Theme.gold : Color(hex: "#45A978"))
                                .frame(width: 5, height: 5)
                            Text(store.dataSourceText)
                            if !store.updatedText.isEmpty {
                                Text("· \(store.updatedText)")
                            }
                            Text("· 一切以官方发布为准")
                        }
                    }
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 8)
                }
                .padding(.horizontal, 18)
                .padding(.top, 24)
                .padding(.bottom, 100)
            }
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
            .refreshable { await store.refreshSeason() }
        }
        .background(Theme.paper)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var standings: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("前八名进入淘汰赛 · 同分依次比较相互战绩、净胜球、进球数")
                .appFont(size: 9)
                .foregroundStyle(Theme.muted)
                .padding(.horizontal, 4)

            VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text("#")
                    .frame(width: 20, alignment: .leading)
                Text("球队")
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("场").frame(width: 24)
                if !dynamicTypeSize.isAccessibilitySize {
                    Text("胜平负").frame(width: 46)
                    Text("净").frame(width: 30)
                }
                Text("积分").frame(width: 34, alignment: .trailing)
            }
            .appFont(size: 10, weight: .semibold)
            .foregroundStyle(Theme.muted)
            .padding(.bottom, 8)

            ForEach(Array(store.standings.enumerated()), id: \.element.id) { index, row in
                NavigationLink(value: Route.team(row.teamId)) {
                    HStack(spacing: 0) {
                        Text("\(index + 1)")
                            .font(.number(12))
                            .foregroundStyle(index < 3 ? Theme.chili : Theme.muted)
                            .frame(width: 20, alignment: .leading)

                        HStack(spacing: 6) {
                            CrestView(team: TeamInfo.map[row.teamId] ?? TeamInfo.all[0], size: 26)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(TeamInfo.map[row.teamId]?.city ?? row.teamId)
                                    .appFont(size: 13, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                                    .lineLimit(1)
                                FormDots(form: row.form)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        Text("\(row.played)")
                            .frame(width: 24)
                        if !dynamicTypeSize.isAccessibilitySize {
                            Text("\(row.won)-\(row.drawn)-\(row.lost)")
                                .appFont(size: 11)
                                .frame(width: 46)
                            Text(row.gd > 0 ? "+\(row.gd)" : "\(row.gd)")
                                .frame(width: 30)
                        }
                        Text("\(row.points)")
                            .font(.number(13))
                            .foregroundStyle(Theme.ink)
                            .frame(width: 34, alignment: .trailing)
                    }
                    .appFont(size: 12)
                    .foregroundStyle(Theme.ink.opacity(0.75))
                    .padding(.vertical, 7)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if index < store.standings.count - 1 {
                    Divider().background(Theme.hairline)
                }
            }
        }
        .card(padding: 12)
        }
    }

    private var scorers: some View {
        VStack(spacing: 0) {
            ForEach(Array(store.scorers.prefix(20).enumerated()), id: \.element.id) { index, scorer in
                let team = TeamInfo.map[scorer.player.teamId] ?? TeamInfo.all[0]
                NavigationLink(value: Route.player(scorer.player.id)) {
                    HStack(spacing: 10) {
                        Text("\(index + 1)")
                            .font(.number(15))
                            .foregroundStyle(index < 3 ? Theme.chili : Theme.muted)
                            .frame(width: 22)

                        CrestView(team: team, size: 28)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(scorer.player.name)
                                .appFont(size: 14, weight: .bold)
                                .foregroundStyle(Theme.ink)
                            Text("\(team.city)队 · \(scorer.player.number)号")
                                .appFont(size: 10)
                                .foregroundStyle(Theme.muted)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 1) {
                            Text("\(scorer.goals)")
                                .font(.number(18))
                                .foregroundStyle(Theme.ink)
                            Text(scorer.penalties > 0 ? "含\(scorer.penalties)点球" : "进球")
                                .appFont(size: 9)
                                .foregroundStyle(Theme.muted)
                        }

                        Image(systemName: "chevron.right")
                            .appFont(size: 10, weight: .semibold)
                            .foregroundStyle(Theme.ink.opacity(0.2))
                    }
                    .padding(.vertical, 9)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if index < min(store.scorers.count, 20) - 1 {
                    Divider().background(Theme.hairline)
                }
            }
        }
        .padding(.horizontal, 12)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var teams: some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
            spacing: 10
        ) {
            ForEach(store.teams) { team in
                let rank = (store.standings.firstIndex { $0.teamId == team.id } ?? 0) + 1
                let points = store.standings.first { $0.teamId == team.id }?.points ?? 0

                NavigationLink(value: Route.team(team.id)) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            CrestView(team: team, size: 34)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 1) {
                                Text("#\(rank)")
                                    .font(.number(11))
                                    .foregroundStyle(Theme.muted)
                                Text("\(points)分")
                                    .appFont(size: 10, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                            }
                        }

                        Text("\(team.city)队")
                            .appFont(size: 15, weight: .bold)
                            .foregroundStyle(Theme.ink)

                        Text("\(team.alias) · \(team.stadium)")
                            .appFont(size: 9)
                            .foregroundStyle(Theme.muted)
                            .lineLimit(1)

                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Theme.ink.opacity(0.06))
                                Capsule()
                                    .fill(team.color)
                                    .frame(width: geometry.size.width * min(1, CGFloat(points) / 30))
                            }
                        }
                        .frame(height: 4)
                    }
                    .card(padding: 12)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
