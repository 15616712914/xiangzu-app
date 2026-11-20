import SwiftUI

struct SearchView: View {
    @EnvironmentObject private var store: SeasonStore
    @State private var query = ""
    @FocusState private var focused: Bool

    private var trimmed: String { query.trimmingCharacters(in: .whitespaces) }

    private var teams: [TeamInfo] {
        guard !trimmed.isEmpty else { return [] }
        return store.teams.filter {
            $0.city.contains(trimmed) || $0.alias.contains(trimmed) || trimmed.contains($0.city)
        }
    }

    private var players: [Player] {
        guard !trimmed.isEmpty else { return [] }
        let number = trimmed.hasSuffix("号") ? String(trimmed.dropLast()) : trimmed
        return store.players.filter {
            $0.name.contains(trimmed) ||
            (Int(number) != nil && $0.number == Int(number)) ||
            ((($0.position ?? "")).contains(trimmed) && trimmed.count > 1)
        }
        .prefix(30)
        .map { $0 }
    }

    private var matches: [Match] {
        guard !teams.isEmpty else { return [] }
        let ids = Set(teams.map(\.id))
        return store.matches
            .filter { ids.contains($0.home) || ids.contains($0.away) }
            .sorted { lhs, rhs in
                if lhs.isUpcoming != rhs.isUpcoming { return lhs.isUpcoming }
                if lhs.isUpcoming {
                    return lhs.date == rhs.date ? lhs.time < rhs.time : lhs.date < rhs.date
                }
                return lhs.date == rhs.date ? lhs.time > rhs.time : lhs.date > rhs.date
            }
            .prefix(13)
            .map { $0 }
    }

    private var hot: [String] {
        var values = store.scorers.prefix(3).map(\.player.name)
        if let fav = store.favTeam.flatMap({ TeamInfo.map[$0] }) {
            values.insert(fav.city, at: 0)
        }
        values.append("永州")
        values.append("长沙")
        var seen = Set<String>()
        return values.filter { seen.insert($0).inserted }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                searchField

                if trimmed.isEmpty {
                    Text("热门搜索")
                        .appFont(size: 11, weight: .bold)
                        .foregroundStyle(Theme.muted)
                    FlowTags(tags: hot) { query = $0 }
                    Text("试试搜「长沙」「永州」，或者球员号码「9号」。")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                } else {
                    if teams.isEmpty && players.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .appFont(size: 22)
                                .foregroundStyle(Theme.muted.opacity(0.6))
                            Text("没有找到“\(trimmed)”的结果")
                                .appFont(size: 12)
                                .foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                    }

                    if !teams.isEmpty {
                        group("球队") {
                            ForEach(teams) { team in
                                NavigationLink(value: Route.team(team.id)) {
                                    HStack(spacing: 10) {
                                        CrestView(team: team, size: 26)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(team.city)队")
                                                .appFont(size: 14, weight: .semibold)
                                                .foregroundStyle(Theme.ink)
                                            Text("\(team.alias) · \(team.stadium)")
                                                .appFont(size: 10)
                                                .foregroundStyle(Theme.muted)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .appFont(size: 10, weight: .semibold)
                                            .foregroundStyle(Theme.ink.opacity(0.2))
                                    }
                                    .padding(.vertical, 9)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if !players.isEmpty {
                        group("球员") {
                            ForEach(players) { player in
                                let team = TeamInfo.map[player.teamId] ?? TeamInfo.all[0]
                                NavigationLink(value: Route.player(player.id)) {
                                    HStack(spacing: 10) {
                                        CrestView(team: team, size: 26)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(player.name)
                                                .appFont(size: 14, weight: .semibold)
                                                .foregroundStyle(Theme.ink)
                                            Text("\(team.city)队 · \(player.number)号 · \(player.goalCount) 球")
                                                .appFont(size: 10)
                                                .foregroundStyle(Theme.muted)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .appFont(size: 10, weight: .semibold)
                                            .foregroundStyle(Theme.ink.opacity(0.2))
                                    }
                                    .padding(.vertical, 9)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if !matches.isEmpty {
                        group("球队比赛") {
                            ForEach(matches) { match in
                                MatchRow(match: match, showStage: true)
                            }
                        }
                    }
                }
            }
            .padding(18)
            .padding(.bottom, 100)
        }
        .background(Theme.paper)
        .navigationTitle("搜索")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { focused = true }
        .toolbar(.hidden, for: .tabBar)
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .appFont(size: 13)
                .foregroundStyle(Theme.ink.opacity(0.4))
            TextField("搜球队、球员、号码", text: $query)
                .appFont(size: 14)
                .focused($focused)
                .submitLabel(.search)
                .autocorrectionDisabled()
            if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .appFont(size: 13)
                        .foregroundStyle(Theme.ink.opacity(0.3))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func group<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .appFont(size: 11, weight: .bold)
                .foregroundStyle(Theme.muted)
            VStack(spacing: 0) {
                content()
            }
            .padding(.horizontal, 12)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }
}

private struct FlowTags: View {
    let tags: [String]
    let action: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 70), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                Button {
                    action(tag)
                } label: {
                    Text(tag)
                        .appFont(size: 12, weight: .medium)
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Theme.card)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
