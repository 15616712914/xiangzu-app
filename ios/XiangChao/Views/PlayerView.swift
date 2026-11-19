import SwiftUI

struct PlayerView: View {
    @EnvironmentObject private var store: SeasonStore
    let playerId: String

    var body: some View {
        Group {
            if let player = store.player(id: playerId) {
                content(player)
            } else {
                ContentUnavailableView("球员不存在", systemImage: "questionmark.circle")
            }
        }
    }

    private func content(_ player: Player) -> some View {
        let team = TeamInfo.map[player.teamId] ?? TeamInfo.all[0]

        return ScrollView {
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("\(team.alias) · \(Brand.league) 2026")
                        .appFont(size: 10, weight: .bold, design: .rounded)
                        .tracking(1.4)
                        .foregroundStyle(.white.opacity(0.6))

                    HStack(alignment: .center, spacing: 16) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(.white.opacity(0.08))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(.white.opacity(0.1), lineWidth: 1)
                                )
                            Text("\(player.number)")
                                .font(.number(46))
                                .foregroundStyle(.white)
                        }
                        .frame(width: 92, height: 108)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(player.name)
                                .font(.display(30))
                                .foregroundStyle(.white)
                            Text("\(team.city)队 · \(player.number)号")
                                .appFont(size: 12)
                                .foregroundStyle(.white.opacity(0.65))
                            if let position = player.position, !position.isEmpty {
                                Text(position)
                                    .appFont(size: 10, weight: .semibold)
                                    .foregroundStyle(.white.opacity(0.8))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(.white.opacity(0.14))
                                    .clipShape(Capsule())
                            }
                        }

                        Spacer()

                        CrestView(team: team, size: 44)
                    }
                }
                .padding(20)
                .padding(.top, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    ZStack {
                        Theme.ink
                        RadialGradient(
                            colors: [team.color.opacity(0.55), .clear],
                            center: .topTrailing,
                            startRadius: 20,
                            endRadius: 400
                        )
                        RadialGradient(
                            colors: [team.color.opacity(0.2), .clear],
                            center: .bottomLeading,
                            startRadius: 0,
                            endRadius: 300
                        )
                        StripeTexture(opacity: 0.6)
                    }
                )

                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 10) {
                        stat("进球", player.goalCount, highlight: true)
                        stat("点球", player.penaltyCount)
                        stat("黄牌", player.yellowCount)
                        stat("红牌", player.redCount)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("赛季数据")
                            .appFont(size: 13, weight: .bold)
                            .foregroundStyle(Theme.ink)
                        Text("2026 赛季官方统计：进球 \(player.goalCount) 个，点球 \(player.penaltyCount) 个，黄牌 \(player.yellowCount) 张，红牌 \(player.redCount) 张。官方未公布逐场进球时间与首发名单。")
                            .appFont(size: 12)
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card(padding: 14)

                    if !teammates(of: player).isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionHeader("同队球员", kicker: "Squad")
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(teammates(of: player)) { mate in
                                        NavigationLink(value: Route.player(mate.id)) {
                                            VStack(spacing: 5) {
                                                Text("\(mate.number)")
                                                    .font(.number(16))
                                                    .foregroundStyle(Theme.muted)
                                                Text(mate.name)
                                                    .appFont(size: 11, weight: .semibold)
                                                    .foregroundStyle(Theme.ink)
                                                    .lineLimit(1)
                                                Text("\(mate.goalCount) 球")
                                                    .appFont(size: 9)
                                                    .foregroundStyle(Theme.muted)
                                            }
                                            .frame(width: 78)
                                            .padding(.vertical, 10)
                                            .background(Theme.card)
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }

                    NavigationLink(value: Route.team(team.id)) {
                        HStack(spacing: 12) {
                            CrestView(team: team, size: 34)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(team.city)队")
                                    .appFont(size: 15, weight: .bold)
                                    .foregroundStyle(Theme.ink)
                                Text("查看球队赛程与阵容")
                                    .appFont(size: 10)
                                    .foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .appFont(size: 12, weight: .semibold)
                                .foregroundStyle(Theme.ink.opacity(0.25))
                        }
                        .card(padding: 14)
                    }
                    .buttonStyle(.plain)

                    Text("数据来源：足球中国 / 湖南省足球联赛 · 一切以官方发布为准")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                        .frame(maxWidth: .infinity, alignment: .center)
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
        .navigationTitle(player.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.ink, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
    }

    private func teammates(of player: Player) -> [Player] {
        (store.playersByTeam[player.teamId] ?? [])
            .filter { $0.id != player.id }
            .sorted { lhs, rhs in
                if lhs.goalCount != rhs.goalCount { return lhs.goalCount > rhs.goalCount }
                return lhs.number < rhs.number
            }
            .prefix(8)
            .map { $0 }
    }

    private func stat(_ label: String, _ value: Int, highlight: Bool = false) -> some View {
        VStack(spacing: 3) {
            Text("\(value)")
                .font(.number(22))
                .foregroundStyle(highlight ? Theme.chili : Theme.ink)
            Text(label)
                .appFont(size: 9)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
