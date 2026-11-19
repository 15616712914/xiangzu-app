import SwiftUI

struct FansView: View {
    @EnvironmentObject private var store: SeasonStore
    @EnvironmentObject private var fan: FanStore

    @State private var cheerTeam = "cs"
    @State private var showAllCheers = false
    @State private var showDelete = false
    @State private var section: FansSection = .vote

    private enum FansSection: String, CaseIterable {
        case vote = "投票"
        case cheer = "助威"
        case rank = "排行"
    }

    var body: some View {
        VStack(spacing: 0) {
            PageHero(
                kicker: "Fan Zone",
                title: "球迷",
                subtitle: "赛果投票 · 城市助威 · 预测排行榜"
            )

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if let error = fan.errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "wifi.exclamationmark")
                            Text(error)
                            Spacer()
                            Button("重试") { Task { await fan.refresh() } }
                                .fontWeight(.semibold)
                        }
                        .appFont(size: 11)
                        .foregroundStyle(Theme.chili)
                        .card(padding: 12)
                    }

                    if fan.isLoggedIn {
                        profile
                    } else {
                        loginCard
                    }

                    SegmentedPill(
                        items: FansSection.allCases,
                        title: { $0.rawValue },
                        selection: $section
                    )

                    switch section {
                    case .vote:
                        voteSection
                    case .cheer:
                        cheerSection
                    case .rank:
                        leaderboard
                    }

                    if fan.isLoggedIn {
                        accountActions
                    }

                    Text("投票仅用于球迷互动，不涉及投注、奖金或兑换。积分只用于排行榜，不构成任何投注建议。")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)
                        .padding(.horizontal, 2)
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
            .refreshable { await fan.refresh() }
        }
        .background(Theme.paper)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            if let favourite = store.favTeam {
                cheerTeam = favourite
            }
            await fan.refresh()
        }
        .confirmationDialog("注销账号？", isPresented: $showDelete, titleVisibility: .visible) {
            Button("注销并删除全部数据", role: .destructive) {
                Task { await fan.deleteAccount() }
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("将删除服务器上的昵称、投票和助威记录，且无法恢复。")
        }
    }

    private var loginCard: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(.white.opacity(0.1))
                Image(systemName: "person.badge.plus")
                    .appFont(size: 17, weight: .semibold)
                    .foregroundStyle(.white)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 3) {
                Text("加入\(Brand.name)球迷")
                    .font(.display(19))
                    .foregroundStyle(.white)
                Text("投票 · 助威 · 排行榜")
                    .appFont(size: 10)
                    .foregroundStyle(.white.opacity(0.55))
            }

            Spacer()

            Button {
                fan.showLogin = true
            } label: {
                Text("登录")
                    .appFont(size: 11, weight: .bold)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 9)
                    .background(.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(
            ZStack {
                Theme.ink
                RadialGradient(
                    colors: [Theme.chili.opacity(0.35), .clear],
                    center: .topLeading,
                    startRadius: 10,
                    endRadius: 320
                )
                StripeTexture(opacity: 0.6)
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var profile: some View {
        let favourite = store.favTeam.flatMap { TeamInfo.map[$0] }
        let name = fan.me?.user.nickname ?? "\(Brand.name)球迷"

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.chili)
                    Text("湘")
                        .appFont(size: 22, weight: .black, design: .serif)
                        .foregroundStyle(Theme.paper)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .appFont(size: 17, weight: .bold)
                        .foregroundStyle(.white)
                    Text("已登录 · 数据仅用于球迷互动")
                        .appFont(size: 9)
                        .foregroundStyle(.white.opacity(0.55))
                }

                Spacer()

                if let team = favourite {
                    CrestView(team: team, size: 32)
                }
            }

            HStack(spacing: 8) {
                stat("积分", "\(fan.me?.points ?? 0)")
                stat("排名", fan.me?.rank.map { "#\($0)" } ?? "—")
                stat("今日助威", "\(fan.cheersToday)/20")
            }
        }
        .padding(16)
        .background(
            ZStack {
                Theme.ink
                if let favourite {
                    RadialGradient(
                        colors: [favourite.color.opacity(0.55), .clear],
                        center: .topTrailing,
                        startRadius: 10,
                        endRadius: 320
                    )
                } else {
                    RadialGradient(
                        colors: [Theme.gold.opacity(0.2), .clear],
                        center: .topTrailing,
                        startRadius: 10,
                        endRadius: 280
                    )
                }
                StripeTexture(opacity: 0.7)
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.score(18))
                .foregroundStyle(.white)
            Text(label)
                .appFont(size: 9)
                .foregroundStyle(.white.opacity(0.55))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(.white.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var cheerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("城市助威榜", kicker: "Cheer") {
                HStack(spacing: 8) {
                    Text(fan.isLoggedIn ? "今日剩余 \(fan.remainingCheers) 次" : "登录后参与")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                    ShareLink(item: cheerShareText) {
                        Image(systemName: "square.and.arrow.up")
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(Theme.chili)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("分享城市助威榜")
                }
            }

            HStack(spacing: 10) {
                Menu {
                    ForEach(store.teams) { team in
                        Button {
                            cheerTeam = team.id
                        } label: {
                            Text("\(team.city)队")
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        CrestView(team: cheerTeamInfo, size: 24)
                        Text(cheerTeamInfo.city)
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(Theme.ink)
                        Image(systemName: "chevron.down")
                            .appFont(size: 9, weight: .bold)
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Theme.card)
                    .clipShape(Capsule())
                }

                Button {
                    if fan.isLoggedIn {
                        Task { await fan.cheer(teamId: cheerTeam) }
                    } else {
                        fan.showLogin = true
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "megaphone.fill")
                        Text(cheerButtonTitle)
                    }
                    .appFont(size: 12, weight: .semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(fan.isLoggedIn && fan.remainingCheers == 0 ? Theme.muted : Theme.chili)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(fan.busy || (fan.isLoggedIn && fan.remainingCheers == 0))
            }

            if cheerRows.contains(where: { $0.count > 0 }) {
                VStack(spacing: 0) {
                    ForEach(Array(visibleCheerRows.enumerated()), id: \.element.team.id) { index, row in
                    HStack(spacing: 8) {
                        Text("\(index + 1)")
                            .font(.number(10))
                            .foregroundStyle(index < 3 ? Theme.chili : Theme.muted)
                            .frame(width: 16, alignment: .leading)
                        CrestView(team: row.team, size: 22)
                        Text(row.team.city)
                            .appFont(size: 12, weight: .medium)
                            .foregroundStyle(Theme.ink)
                            .frame(width: 44, alignment: .leading)
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Theme.ink.opacity(0.06))
                                Capsule()
                                    .fill(row.team.color)
                                    .frame(width: geometry.size.width * row.ratio)
                            }
                        }
                        .frame(height: 5)
                        Text(formatCount(row.count))
                            .font(.number(10))
                            .foregroundStyle(Theme.muted)
                            .frame(width: 52, alignment: .trailing)
                    }
                        .padding(.vertical, 6)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                if cheerRows.count > 5 {
                    Button(showAllCheers ? "收起助威榜" : "查看全部 \(cheerRows.count) 队") {
                        withAnimation { showAllCheers.toggle() }
                    }
                    .appFont(size: 10, weight: .semibold)
                    .foregroundStyle(Theme.chili)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .buttonStyle(.plain)
                }
            } else {
                Text("还没有人助威。点上面的按钮，为家乡球队 +1。")
                    .appFont(size: 11)
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card(padding: 12)
            }
        }
    }

    private var visibleCheerRows: [(team: TeamInfo, count: Int, ratio: CGFloat)] {
        Array(cheerRows.prefix(showAllCheers ? cheerRows.count : 5))
    }

    private var cheerShareText: String {
        let top = cheerRows
            .prefix(3)
            .filter { $0.count > 0 }
            .map { "\($0.team.city) \(formatCount($0.count))" }
            .joined(separator: " / ")
        let board = top.isEmpty ? "还没有人助威，来为家乡打 call" : top
        return "\(Brand.name) 2026 城市助威榜：\(board)。我在为\(cheerTeamInfo.city)助威，App Store 搜索「\(Brand.name)」一起参与。"
    }

    private var cheerButtonTitle: String {
        if !fan.isLoggedIn { return "登录后助威" }
        if fan.remainingCheers == 0 { return "今日次数已用完" }
        return "为\(cheerTeamInfo.city)助威 +1"
    }

    private var cheerRows: [(team: TeamInfo, count: Int, ratio: CGFloat)] {
        let counts = Dictionary(uniqueKeysWithValues: (fan.board?.teams ?? []).map { ($0.teamId, $0.count) })
        let all = store.teams.map { (team: $0, count: counts[$0.id] ?? 0) }
        let order = Dictionary(uniqueKeysWithValues: store.teams.enumerated().map { ($0.element.id, $0.offset) })
        let sorted = all.sorted { lhs, rhs in
            if lhs.count != rhs.count { return lhs.count > rhs.count }
            return (order[lhs.team.id] ?? 0) < (order[rhs.team.id] ?? 0)
        }
        let max = max(1, sorted.map(\.count).max() ?? 0)
        return sorted.map { (team: $0.team, count: $0.count, ratio: CGFloat($0.count) / CGFloat(max)) }
    }

    private var voteSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("本轮对阵")
                    .appFont(size: 11, weight: .bold)
                    .foregroundStyle(Theme.muted)
                Spacer()
                Text("猜中胜平负 +10 分")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
            }
            .padding(.horizontal, 2)

            ForEach(store.upcomingMatches.prefix(4)) { match in
                VoteCard(match: match, compact: true, showsLoginPrompt: false)
            }

            if store.upcomingMatches.isEmpty {
                Text("本赛季比赛已全部结束，下赛季见。")
                    .appFont(size: 11)
                    .foregroundStyle(Theme.muted)
                    .card(padding: 12)
            }

            if fan.isLoggedIn, !predictionHistory.isEmpty {
                SectionHeader("我的预测", kicker: "History") {
                    Text("猜中 \(fan.me?.correct ?? 0)/\(fan.me?.total ?? 0)")
                }
                .padding(.top, 8)

                VStack(spacing: 0) {
                    ForEach(Array(predictionHistory.enumerated()), id: \.element.id) { index, match in
                        if index > 0 {
                            Divider().background(Theme.hairline)
                        }
                        predictionRow(match)
                    }
                }
                .padding(.horizontal, 14)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
    }

    private var predictionHistory: [Match] {
        guard let votes = fan.me?.votes else { return [] }
        return Array(store.matches
            .filter { $0.isFinished && votes[$0.id] != nil }
            .sorted { $0.date == $1.date ? $0.time > $1.time : $0.date > $1.date }
            .prefix(8))
    }

    private func predictionRow(_ match: Match) -> some View {
        let votes = fan.me?.votes ?? [:]
        let mine = votes[match.id]
        let correct = mine != nil && mine == match.resultChoice
        let home = TeamInfo.map[match.home] ?? TeamInfo.all[0]
        let away = TeamInfo.map[match.away] ?? TeamInfo.all[0]

        return NavigationLink(value: Route.match(match.id)) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(home.city) \(match.homeGoals)-\(match.awayGoals) \(away.city)")
                        .appFont(size: 13, weight: .semibold)
                        .foregroundStyle(Theme.ink)
                    Text("\(League.formatDate(match.date)) · \(League.stageLabel(match)) · 你选\(voteLabel(mine, home: home, away: away))")
                        .appFont(size: 9)
                        .foregroundStyle(Theme.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                Spacer()
                Text(correct ? "猜中 +10" : "未中")
                    .appFont(size: 9, weight: .bold)
                    .foregroundStyle(correct ? Color(hex: "#2F7D57") : Theme.muted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((correct ? Color(hex: "#45A978") : Theme.muted).opacity(0.12))
                    .clipShape(Capsule())
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func voteLabel(_ choice: VoteChoice?, home: TeamInfo, away: TeamInfo) -> String {
        switch choice {
        case .home: return "\(home.city)胜"
        case .draw: return "平局"
        case .away: return "\(away.city)胜"
        case nil: return "未投票"
        }
    }

    private var leaderboard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("预测排行榜", kicker: "Leaderboard") {
                Text("每猜中一场 +10 分")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
            }

            if let rows = fan.board?.leaderboard, !rows.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                        HStack(spacing: 10) {
                            Text("\(row.rank)")
                                .font(.number(12))
                                .foregroundStyle(row.rank <= 3 ? Theme.chili : Theme.muted)
                                .frame(width: 20, alignment: .leading)
                            Text(row.nickname)
                                .appFont(size: 13, weight: row.isMe ? .bold : .medium)
                                .foregroundStyle(Theme.ink)
                                .lineLimit(1)
                            if row.isMe {
                                Text("我")
                                    .appFont(size: 8, weight: .bold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(Theme.chili)
                                    .clipShape(Capsule())
                            }
                            Spacer()
                            Text("猜中 \(row.correct)/\(row.total)")
                                .appFont(size: 9)
                                .foregroundStyle(Theme.muted)
                            Text("\(row.points) 分")
                                .font(.number(12))
                                .foregroundStyle(Theme.ink)
                                .frame(width: 52, alignment: .trailing)
                        }
                        .padding(.vertical, 9)
                        if index < rows.count - 1 {
                            Divider().background(Theme.hairline)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("还没有人完成预测。")
                        .appFont(size: 12, weight: .semibold)
                        .foregroundStyle(Theme.ink)
                    Text("比赛结束后，猜中胜平负的球迷会出现在这里。")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card(padding: 14)
            }

            if !fan.isLoggedIn {
                Button("登录后参与排行榜") { fan.showLogin = true }
                    .appFont(size: 11, weight: .semibold)
                    .foregroundStyle(Theme.chili)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Theme.chili.opacity(0.08))
                    .clipShape(Capsule())
                    .buttonStyle(.plain)
            }
        }
    }

    private var accountActions: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("账号", kicker: "Account")

            VStack(spacing: 0) {
                Button {
                    Task { await fan.logout() }
                } label: {
                    HStack {
                        Text("退出登录")
                            .appFont(size: 13)
                            .foregroundStyle(Theme.ink)
                        Spacer()
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .appFont(size: 12)
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(.vertical, 12)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Divider().background(Theme.hairline)

                Button {
                    showDelete = true
                } label: {
                    HStack {
                        Text("注销账号并删除数据")
                            .appFont(size: 13)
                            .foregroundStyle(Theme.chili)
                        Spacer()
                        Image(systemName: "trash")
                            .appFont(size: 12)
                            .foregroundStyle(Theme.chili.opacity(0.7))
                    }
                    .padding(.vertical, 12)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var cheerTeamInfo: TeamInfo {
        TeamInfo.map[cheerTeam] ?? TeamInfo.all[0]
    }

    private func formatCount(_ count: Int) -> String {
        if count >= 10000 {
            return String(format: "%.1f万", Double(count) / 10000)
        }
        return "\(count)"
    }
}
