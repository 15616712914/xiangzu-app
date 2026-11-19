import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: SeasonStore
    @State private var round = League.currentRound
    @State private var matchDay: String?

    var body: some View {
        VStack(spacing: 0) {
            hero
                .fixedSize(horizontal: false, vertical: true)

            ScrollView {
                sheet
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
        }
        .background(Theme.paper)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 18) {
            brandRow
            if let match = store.featuredMatch {
                HeroMatchCard(match: match)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 30)
        .background {
            ZStack {
                Theme.ink
                StripeTexture(opacity: 0.8)
            }
            .ignoresSafeArea(edges: .top)
        }
    }

    private var brandRow: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.chili)
                Text("湘")
                    .appFont(size: 22, weight: .black, design: .serif)
                    .foregroundStyle(Theme.paper)
            }
            .frame(width: 38, height: 38)

            VStack(alignment: .leading, spacing: 1) {
                Text(Brand.name)
                    .font(.display(22))
                    .foregroundStyle(.white)
                Text(Brand.tagline)
                    .appFont(size: 9, weight: .semibold, design: .rounded)
                    .tracking(1.4)
                    .foregroundStyle(.white.opacity(0.5))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Spacer()

            NavigationLink(value: Route.search) {
                Image(systemName: "magnifyingglass")
                    .appFont(size: 15, weight: .semibold)
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(width: 44, height: 44)
                    .background(.white.opacity(0.08))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(.white.opacity(0.08), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("搜索")

            NavigationLink(value: Route.reminders) {
                Image(systemName: "bell")
                    .appFont(size: 15, weight: .semibold)
                    .foregroundStyle(.white.opacity(0.85))
                    .frame(width: 44, height: 44)
                    .background(.white.opacity(0.08))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(.white.opacity(0.08), lineWidth: 1))
                    .overlay(alignment: .topTrailing) {
                        if !store.activeReminders.isEmpty {
                            CountBadge(count: store.activeReminders.count)
                                .offset(x: 5, y: -5)
                        }
                    }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("提醒")

            if let favourite = store.favTeam.flatMap({ TeamInfo.map[$0] }) {
                NavigationLink(value: Route.team(favourite.id)) {
                    CrestView(team: favourite, size: 26)
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.08))
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.white.opacity(0.08), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("我的主队 \(favourite.city)")
            }
        }
    }

    private var sheet: some View {
        VStack(alignment: .leading, spacing: 24) {
            if let error = store.loadError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(Theme.chili)
                    .card()
            }

            matchDays

            if let favourite = store.favTeam,
               let team = TeamInfo.map[favourite],
               let next = store.nextMatch(for: favourite) {
                FavouriteNextCard(team: team, match: next)
            }

            aiPicks
            bracketLink
            if !store.recentResults.isEmpty {
                recentResults
            }
            fixtures

            VStack(spacing: 4) {
                Text("数据来源：足球中国 / 湖南省足球联赛")
                Button {
                    Task { await store.refreshSeason() }
                } label: {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(store.usingBundledData ? Theme.gold : Color(hex: "#45A978"))
                            .frame(width: 5, height: 5)
                        Text(store.dataSourceText)
                        Text(store.updatedText.isEmpty ? "· 刷新" : "· \(store.updatedText) · 刷新")
                        Image(systemName: "arrow.clockwise")
                    }
                    .appFont(size: 10, weight: .medium)
                    .foregroundStyle(Theme.muted)
                }
                .buttonStyle(.plain)
                Text("一切以官方发布为准")
            }
            .appFont(size: 10)
            .foregroundStyle(Theme.muted)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.top, 4)
        }
        .padding(.horizontal, 18)
        .padding(.top, 24)
        .padding(.bottom, 100)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var matchDays: some View {
        let groups = matchDayGroups
        let selected = selectedDay

        return Group {
            if let selected, let group = groups.first(where: { $0.date == selected }) {
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader("比赛日", kicker: "Matchday") {
                        if group.matches.contains(where: \.isLive) {
                            HStack(spacing: 4) {
                                Circle().fill(Theme.chili).frame(width: 5, height: 5)
                                Text("进行中")
                                    .foregroundStyle(Theme.chili)
                            }
                        } else {
                            Text(League.formatDate(selected))
                        }
                    }
                    .appFont(size: 10)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(groups) { item in
                                Button {
                                    matchDay = item.date
                                } label: {
                                    HStack(spacing: 5) {
                                        if item.matches.contains(where: \.isLive) {
                                            Circle().fill(Theme.chili).frame(width: 5, height: 5)
                                        }
                                        Text(League.dayChipLabel(item.date))
                                            .appFont(size: 12, weight: .semibold)
                                        Text("\(item.matches.count) 场")
                                            .appFont(size: 9)
                                            .opacity(0.6)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(item.date == selected ? Theme.ink : Color.white)
                                    .foregroundStyle(item.date == selected ? Color.white : Theme.ink)
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    VStack(spacing: 0) {
                        ForEach(Array(group.matches.enumerated()), id: \.element.id) { index, match in
                            if index > 0 {
                                Divider().background(Theme.hairline)
                            }
                            MatchRow(match: match, showStage: true)
                        }
                    }
                    .padding(.horizontal, 14)
                    .background(Theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
    }

    private var matchDayGroups: [MatchDay] {
        let list = store.matches.filter { $0.isLive || $0.isUpcoming }
        let grouped = Dictionary(grouping: list, by: \.date)
        return grouped.keys.sorted().compactMap { date in
            guard let matches = grouped[date] else { return nil }
            let ordered = matches.sorted { lhs, rhs in
                if lhs.isLive != rhs.isLive { return lhs.isLive }
                return lhs.time < rhs.time
            }
            return MatchDay(date: date, matches: ordered)
        }
    }

    private var selectedDay: String? {
        if let matchDay, matchDayGroups.contains(where: { $0.date == matchDay }) {
            return matchDay
        }
        return matchDayGroups.first(where: { group in group.matches.contains(where: \.isLive) })?.date
            ?? matchDayGroups.first?.date
    }

    private var aiPicks: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("数据模型", kicker: "Model") {
                Text("本季命中 \(store.backtest.hits)/\(store.backtest.total)")
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(store.upcomingMatches.prefix(6)) { match in
                        AIPickCard(match: match, prediction: store.prediction(for: match))
                    }
                }
                .padding(.horizontal, 2)
                .scrollTargetLayout()
            }
            .contentMargins(.trailing, 18, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)

            Text("本地模型推演，仅供娱乐，不构成投注建议")
                .appFont(size: 10)
                .foregroundStyle(Theme.muted)
        }
    }

    private var bracketLink: some View {
        NavigationLink(value: Route.bracket) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.gold.opacity(0.14))
                    Image(systemName: "trophy.fill")
                        .appFont(size: 16, weight: .semibold)
                        .foregroundStyle(Theme.gold)
                }
                .frame(width: 42, height: 42)

                VStack(alignment: .leading, spacing: 2) {
                    Text("KNOCKOUT")
                        .appFont(size: 9, weight: .bold, design: .rounded)
                        .tracking(1.4)
                        .foregroundStyle(Theme.gold)
                    Text("淘汰赛对阵 · 四强出炉")
                        .appFont(size: 16, weight: .bold)
                        .foregroundStyle(Theme.ink)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .appFont(size: 12, weight: .semibold)
                    .foregroundStyle(Theme.ink.opacity(0.25))
            }
            .card(padding: 14)
        }
        .buttonStyle(.plain)
    }

    private var recentResults: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("最近赛果", kicker: "Results")

            VStack(spacing: 0) {
                ForEach(Array(store.recentResults.enumerated()), id: \.element.id) { index, match in
                    MatchRow(match: match, showStage: true)
                    if index < store.recentResults.count - 1 {
                        Divider().background(Theme.hairline)
                    }
                }
            }
            .padding(.horizontal, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var fixtures: some View {
        VStack(alignment: .leading, spacing: 12) {
            let leagueComplete = store.matches
                .filter { $0.phase == .league }
                .allSatisfy { $0.status == .finished }

            SectionHeader("常规赛赛程", kicker: "Fixtures") {
                Text(leagueComplete ? "常规赛已结束" : "共 \(League.totalRounds) 轮")
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(1...League.totalRounds, id: \.self) { value in
                        Button {
                            round = value
                        } label: {
                            Text("第\(value)轮")
                                .appFont(size: 12, weight: .semibold)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(value == round ? Theme.ink : Color.white)
                            .foregroundStyle(value == round ? Color.white : Theme.ink)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            let grouped = Dictionary(
                grouping: store.matches.filter { $0.phase == .league && $0.round == round },
                by: \.date
            )
            .sorted { $0.key < $1.key }

            ForEach(grouped, id: \.key) { date, list in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Text(League.formatDate(date))
                            .appFont(size: 11, weight: .semibold)
                            .foregroundStyle(Theme.muted)
                        Rectangle()
                            .fill(Theme.hairline)
                            .frame(height: 1)
                        Text("\(list.count) 场")
                            .appFont(size: 10)
                            .foregroundStyle(Theme.muted)
                    }

                    VStack(spacing: 0) {
                        ForEach(Array(list.enumerated()), id: \.element.id) { index, match in
                            if index > 0 {
                                Divider().background(Theme.hairline)
                            }
                            MatchRow(match: match)
                        }
                    }
                    .padding(.horizontal, 14)
                    .background(Theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
    }
}

private struct HeroMatchCard: View {
    let match: Match

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        NavigationLink(value: Route.match(match.id)) {
            ZStack {
                Theme.darkCard
                RadialGradient(
                    colors: [home.color.opacity(0.4), .clear],
                    center: .leading,
                    startRadius: 8,
                    endRadius: 240
                )
                RadialGradient(
                    colors: [away.color.opacity(0.4), .clear],
                    center: .trailing,
                    startRadius: 8,
                    endRadius: 240
                )
                StripeTexture(opacity: 0.6)

                VStack(spacing: 14) {
                    HStack {
                        Text("\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                            .appFont(size: 11, weight: .semibold, design: .rounded)
                            .foregroundStyle(.white.opacity(0.55))
                        Spacer()
                        Text(match.isLive ? (match.liveMinute.map { "\($0)'" } ?? "进行中") : match.stateLabel)
                            .appFont(size: 10, weight: .bold)
                            .foregroundStyle(match.isLive ? Theme.gold : .white.opacity(0.7))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.white.opacity(0.1))
                            .clipShape(Capsule())
                    }

                    HStack(spacing: 8) {
                        teamColumn(home)

                        Spacer(minLength: 4)

                        VStack(spacing: 4) {
                            if match.status == .upcoming {
                                Text("VS")
                                    .font(.score(34))
                                    .foregroundStyle(.white)
                            } else {
                                Text("\(match.homeGoals) : \(match.awayGoals)")
                                    .font(.score(38))
                                    .foregroundStyle(.white)
                            }

                            if let penalty = match.penalty, penalty.count == 2 {
                                Text("点球 \(penalty[0]):\(penalty[1])")
                                    .appFont(size: 10, weight: .bold)
                                    .foregroundStyle(Theme.gold)
                            } else {
                                Text(match.isLive
                                    ? (match.liveMinute.map { "\($0)' 进行中" } ?? "进行中")
                                    : match.heroStatusLabel)
                                    .appFont(size: 10)
                                    .foregroundStyle(.white.opacity(0.45))
                            }
                        }
                        .frame(width: 100)

                        Spacer(minLength: 4)

                        teamColumn(away)
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
                    }

                    HStack(spacing: 5) {
                        Image(systemName: "mappin.and.ellipse")
                        Text(match.venue(or: home.stadium))
                            .lineLimit(1)
                        if let attendance = match.attendance, attendance > 0 {
                            Text("· 现场 \(attendance) 人")
                                .lineLimit(1)
                        }
                        Spacer()
                        Text("查看详情")
                            .fontWeight(.semibold)
                        Image(systemName: "chevron.right")
                    }
                    .appFont(size: 10)
                    .foregroundStyle(.white.opacity(0.55))
                }
                .padding(18)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(.white.opacity(0.08), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func teamColumn(_ team: TeamInfo) -> some View {
        VStack(spacing: 7) {
            CrestView(team: team, size: 58)
            Text(team.city)
                .appFont(size: 14, weight: .bold)
                .foregroundStyle(.white)
            Text(team.alias)
                .appFont(size: 9)
                .foregroundStyle(.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity)
    }
}

private struct FavouriteNextCard: View {
    let team: TeamInfo
    let match: Match

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("我的主队", kicker: "My Club")

            NavigationLink(value: Route.match(match.id)) {
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(team.color)
                        .frame(width: 4, height: 44)

                    CrestView(team: team, size: 42)

                    VStack(alignment: .leading, spacing: 3) {
                        Text("下一场 · \(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                            .appFont(size: 10, weight: .semibold)
                            .foregroundStyle(Theme.muted)
                            .lineLimit(1)
                        Text("\(home.city) vs \(away.city)")
                            .appFont(size: 16, weight: .bold)
                            .foregroundStyle(Theme.ink)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .appFont(size: 12, weight: .semibold)
                        .foregroundStyle(Theme.ink.opacity(0.25))
                }
                .card(padding: 12)
            }
            .buttonStyle(.plain)
        }
    }
}

private struct AIPickCard: View {
    let match: Match
    let prediction: Prediction

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        NavigationLink(value: Route.match(match.id)) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                        .appFont(size: 9, weight: .semibold, design: .rounded)
                        .foregroundStyle(.white.opacity(0.55))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Spacer(minLength: 4)
                    Text("置信度\(prediction.confidence)")
                        .appFont(size: 9, weight: .bold, design: .rounded)
                        .foregroundStyle(.white.opacity(0.65))
                }

                HStack {
                    VStack(spacing: 4) {
                        CrestView(team: home, size: 30)
                        Text(home.city)
                            .appFont(size: 10, weight: .semibold)
                            .foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity)

                    Text("\(prediction.predicted.0):\(prediction.predicted.1)")
                        .font(.score(24))
                        .foregroundStyle(.white)

                    VStack(spacing: 4) {
                        CrestView(team: away, size: 30)
                        Text(away.city)
                            .appFont(size: 10, weight: .semibold)
                            .foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity)
                }

                ProbabilityBar(
                    probs: prediction.probs,
                    homeColor: home.color,
                    awayColor: away.color,
                    height: 4
                )

                Text("看好 \(pickText)")
                    .appFont(size: 10, weight: .semibold)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(12)
            .frame(width: 230)
            .background(Theme.darkCard)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var pickText: String {
        switch prediction.pick {
        case .home: return "\(home.city)胜"
        case .away: return "\(away.city)胜"
        case .draw: return "平局"
        }
    }
}


private struct MatchDay: Identifiable {
    let date: String
    let matches: [Match]
    var id: String { date }
}
