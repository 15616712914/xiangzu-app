import Foundation
import SwiftUI

extension SeasonFile {
    static let empty = SeasonFile(
        season: 2026,
        source: "",
        updatedAt: "",
        teams: [],
        matches: [],
        squads: [:]
    )
}

@MainActor
final class SeasonStore: ObservableObject {
    @Published private(set) var season = SeasonFile.empty
    @Published private(set) var teams = TeamInfo.all
    @Published private(set) var matches: [Match] = []
    @Published private(set) var players: [Player] = []
    @Published private(set) var playersByTeam: [String: [Player]] = [:]
    @Published private(set) var standings: [StandingRow] = []
    @Published private(set) var scorers: [ScorerRow] = []
    @Published private(set) var backtest = Backtest(total: 0, hits: 0, exact: 0)
    @Published private(set) var lastUpdated = ""
    @Published private(set) var usingBundledData = true
    @Published private(set) var loadError: String?
    private var livePollingTask: Task<Void, Never>?
    @Published var alertMessage: String?
    @Published var alertOpensSettings = false

    @Published var favTeam: String? {
        didSet {
            if let favTeam {
                UserDefaults.standard.set(favTeam, forKey: "xiangchao.fav")
            } else {
                UserDefaults.standard.removeObject(forKey: "xiangchao.fav")
            }
        }
    }

    @Published var reminders: Set<String> {
        didSet {
            UserDefaults.standard.set(Array(reminders).sorted(), forKey: "xiangchao.reminders")
        }
    }

    @Published var readNotifs: Set<String> {
        didSet {
            UserDefaults.standard.set(Array(readNotifs).sorted(), forKey: "xiangchao.read")
        }
    }

    struct NotificationItem: Identifiable, Hashable {
        let id: String
        let title: String
        let body: String
        let time: String
        let matchId: String
    }

    var notifications: [NotificationItem] {
        let favourite = favTeam.flatMap { TeamInfo.map[$0] }
        let chosen: [Match]
        if let favourite {
            chosen = Array(upcomingMatches.filter { $0.home == favourite.id || $0.away == favourite.id }.prefix(3))
        } else {
            chosen = Array(upcomingMatches.prefix(3))
        }
        return chosen.map { match in
            let home = TeamInfo.map[match.home]?.city ?? match.home
            let away = TeamInfo.map[match.away]?.city ?? match.away
            let mine = favourite != nil && (match.home == favourite?.id || match.away == favourite?.id)
            return NotificationItem(
                id: "kickoff-\(match.id)",
                title: mine
                    ? "\(favourite?.city ?? "")队 · \(League.stageLabel(match))"
                    : "\(League.stageLabel(match))比赛预告",
                body: "\(League.stageLabel(match)) \(home) vs \(away)，\(League.formatDate(match.date)) \(match.time)",
                time: "即将开始",
                matchId: match.id
            )
        }
    }

    var unreadCount: Int {
        notifications.filter { !readNotifs.contains($0.id) }.count
    }

    func markRead(_ id: String) {
        readNotifs.insert(id)
    }

    init() {
        favTeam = UserDefaults.standard.string(forKey: "xiangchao.fav")
        reminders = Set(UserDefaults.standard.stringArray(forKey: "xiangchao.reminders") ?? [])
        readNotifs = Set(UserDefaults.standard.stringArray(forKey: "xiangchao.read") ?? [])

        if let url = Bundle.main.url(forResource: "season", withExtension: "json"),
           let data = try? Data(contentsOf: url) {
            do {
                let file = try JSONDecoder().decode(SeasonFile.self, from: data)
                season = file
                apply(matches: file.matches, squads: file.squads, updatedAt: file.updatedAt)
            } catch {
                loadError = "赛事数据读取失败：\(error.localizedDescription)"
            }
        } else {
            loadError = "未找到内置赛事数据。"
        }

        if let cached = LocalCache.load(RemoteLeague.self, name: "league.json"),
           !cached.matches.isEmpty {
            apply(matches: cached.matches, squads: cached.squads, updatedAt: cached.updatedAt)
            usingBundledData = true
        }

        #if DEBUG
        SelfCheck.run(store: self)
        #endif

        Task {
            await rescheduleReminders()
            await refreshSeason()
            startLivePolling()
        }
    }

    deinit {
        livePollingTask?.cancel()
    }

    var updatedText: String {
        guard !lastUpdated.isEmpty else { return "" }
        let formatted = League.formatUpdatedAt(lastUpdated)
        return formatted.isEmpty ? "" : "更新于 \(formatted)"
    }

    var dataSourceText: String {
        usingBundledData ? "离线数据" : "官方数据"
    }

    func refreshSeason() async {
        do {
            let remote = try await SeasonAPI(baseURL: AppConfig.apiBaseURL).league()
            guard !remote.matches.isEmpty else { return }
            apply(matches: remote.matches, squads: remote.squads, updatedAt: remote.updatedAt)
            LocalCache.save(remote, name: "league.json")
            usingBundledData = false
            await rescheduleReminders()
            startLivePolling()
        } catch {
            // Offline or server unavailable: keep the bundled snapshot and mark it.
            usingBundledData = true
        }
    }

    var recentResults: [Match] {
        matches
            .filter { $0.isFinished }
            .sorted { lhs, rhs in
                lhs.date == rhs.date ? lhs.time > rhs.time : lhs.date > rhs.date
            }
            .prefix(3)
            .map { $0 }
    }

    private func startLivePolling() {
        guard livePollingTask == nil, matches.contains(where: { $0.isLive }) else { return }
        livePollingTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                guard !Task.isCancelled, let self else { return }
                await self.refreshSeason()
                if !self.matches.contains(where: { $0.isLive }) {
                    break
                }
            }
            self?.livePollingTask = nil
        }
    }

    private func apply(matches incoming: [Match], squads: [String: [Player]], updatedAt: String?) {
        matches = incoming.sorted { lhs, rhs in
            lhs.date == rhs.date ? lhs.time < rhs.time : lhs.date < rhs.date
        }
        playersByTeam = squads
        let allPlayers: [Player] = squads.values
            .flatMap { $0 }
            .sorted { lhs, rhs in
                if lhs.teamId != rhs.teamId { return lhs.teamId < rhs.teamId }
                return lhs.number < rhs.number
            }
        players = allPlayers
        standings = League.standings(matches: matches)
        scorers = League.scorers(players: allPlayers)
        backtest = Predictor.backtest(matches: matches)
        if let updatedAt, !updatedAt.isEmpty {
            lastUpdated = updatedAt
        }
    }

    var featuredMatch: Match? {
        matches.first { $0.status == .live }
            ?? matches.first { $0.status == .upcoming }
            ?? matches.last
    }

    var upcomingMatches: [Match] {
        matches
            .filter { $0.status == .upcoming }
            .sorted { $0.date == $1.date ? $0.time < $1.time : $0.date < $1.date }
    }

    var activeReminders: [Match] {
        upcomingMatches.filter { reminders.contains($0.id) }
    }

    func match(id: String) -> Match? {
        matches.first { $0.id == id }
    }

    func team(id: String) -> TeamInfo? {
        TeamInfo.map[id]
    }

    func player(id: String) -> Player? {
        players.first { $0.id == id }
    }

    func nextMatch(for teamId: String) -> Match? {
        upcomingMatches.first { $0.home == teamId || $0.away == teamId }
    }

    func matches(for teamId: String, includeUpcoming: Bool) -> [Match] {
        let filtered = matches.filter { $0.home == teamId || $0.away == teamId }
        if includeUpcoming {
            return filtered
                .filter { $0.status == .upcoming }
                .sorted { $0.date == $1.date ? $0.time < $1.time : $0.date < $1.date }
        }
        return filtered
            .filter { $0.status == .finished }
            .sorted { $0.date == $1.date ? $0.time > $1.time : $0.date > $1.date }
    }

    func prediction(for match: Match, liveMinute: Int? = nil) -> Prediction {
        Predictor.predict(match, liveMinute: liveMinute, all: matches, teams: teams)
    }

    func setFavourite(_ teamId: String) {
        favTeam = teamId
    }

    func toggleReminder(_ match: Match) async {
        if reminders.contains(match.id) {
            reminders.remove(match.id)
            NotificationManager.shared.cancel(matchId: match.id)
            Analytics.track(.reminderRemoved, properties: ["match": match.id])
            return
        }

        guard match.status == .upcoming else { return }
        let granted = await NotificationManager.shared.requestAuthorization()
        guard granted else {
            alertMessage = "系统通知权限未开启。请到 设置 > 通知 > \(Brand.name) 中允许通知，再加入开赛提醒。"
            alertOpensSettings = true
            return
        }

        reminders.insert(match.id)
        await NotificationManager.shared.schedule(match: match)
        Analytics.track(.reminderAdded, properties: ["match": match.id])

        if let kickoff = League.kickoffDate(match), kickoff.addingTimeInterval(-30 * 60) <= Date() {
            alertMessage = "这场比赛距开赛不足 30 分钟，系统无法提前 30 分钟提醒。"
            alertOpensSettings = false
        }
    }

    func rescheduleReminders() async {
        let activeIds = Set(activeReminders.map(\.id))
        for id in Array(reminders) where !activeIds.contains(id) {
            reminders.remove(id)
            NotificationManager.shared.cancel(matchId: id)
        }
        for match in activeReminders {
            await NotificationManager.shared.schedule(match: match)
        }
    }
}

#if DEBUG
enum SelfCheck {
    @MainActor
    static func run(store: SeasonStore) {
        assert(store.matches.count > 90, "season data missing")
        assert(store.standings.first?.points == 30, "standings top points")
        assert(store.standings.first(where: { $0.teamId == "ld" })?.points == 29, "Loudi points")
        assert(store.scorers.count > 10, "scorer list")
        assert(store.scorers.first?.goals ?? 0 > 0, "top scorer goals")
        assert(store.scorers.map(\.goals) == store.scorers.map(\.goals).sorted(by: >), "scorers sorted")

        if let upcoming = store.matches.first(where: { $0.status == .upcoming }) {
            let prediction = store.prediction(for: upcoming)
            let total = prediction.probs.values.reduce(0, +)
            assert(abs(total - 1) < 0.001, "probabilities should sum to one")
        }

        let quarterFinals = Tie.stageTies(matches: store.matches, firstRound: 14, secondRound: 15)
        if let loudi = quarterFinals.first(where: { $0.home == "hy" && $0.away == "ld" }) {
            assert(loudi.winner == "ld", "Loudi should win the penalty shoot-out")
            assert(loudi.penHome == 6 && loudi.penAway == 7, "penalty score")
        }

        print("[XiangChao] self-check passed")
    }
}
#endif
