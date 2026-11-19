import Foundation

enum League {
    static let currentRound = 13
    static let totalRounds = 13

    private static let calendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Shanghai")!
        return cal
    }()

    static func stageLabel(_ match: Match) -> String {
        match.phase == .knockout ? (match.stage ?? "淘汰赛") : "第\(match.round)轮"
    }

    static func formatUpdatedAt(_ raw: String) -> String {
        guard !raw.isEmpty else { return "" }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        guard let date = withFraction.date(from: raw) ?? plain.date(from: raw) else {
            return raw
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        formatter.dateFormat = "M月d日 HH:mm"
        return formatter.string(from: date)
    }

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static var todayString: String {
        dayFormatter.string(from: Date())
    }

    static func dayChipLabel(_ date: String) -> String {
        if date == todayString { return "今天" }
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date()),
           dayFormatter.string(from: tomorrow) == date {
            return "明天"
        }
        let parts = date.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }

    static func formatDate(_ date: String) -> String {
        let parts = date.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return date }
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        guard let day = calendar.date(from: comps) else { return date }
        let weekday = calendar.component(.weekday, from: day)
        let names = ["日", "一", "二", "三", "四", "五", "六"]
        return "\(parts[1])月\(parts[2])日 周\(names[weekday - 1])"
    }

    static func kickoffDate(_ match: Match) -> Date? {
        let dateParts = match.date.split(separator: "-").compactMap { Int($0) }
        let timeParts = match.time.split(separator: ":").compactMap { Int($0) }
        guard dateParts.count == 3, timeParts.count == 2 else { return nil }
        var comps = DateComponents()
        comps.year = dateParts[0]
        comps.month = dateParts[1]
        comps.day = dateParts[2]
        comps.hour = timeParts[0]
        comps.minute = timeParts[1]
        return calendar.date(from: comps)
    }

    static func standings(matches: [Match], teams: [TeamInfo] = TeamInfo.all) -> [StandingRow] {
        var rows = Dictionary(uniqueKeysWithValues: teams.map { ($0.id, StandingRow(teamId: $0.id)) })
        for match in matches where match.phase == .league && match.status == .finished {
            guard var home = rows[match.home], var away = rows[match.away] else { continue }
            add(&home, gf: match.homeGoals, ga: match.awayGoals)
            add(&away, gf: match.awayGoals, ga: match.homeGoals)
            rows[match.home] = home
            rows[match.away] = away
        }

        let byPoints = rows.values.sorted { $0.points > $1.points }
        var groups: [[StandingRow]] = []
        for row in byPoints {
            if var last = groups.last, let first = last.first, first.points == row.points {
                last.append(row)
                groups[groups.count - 1] = last
            } else {
                groups.append([row])
            }
        }

        var ordered: [StandingRow] = []
        for var group in groups {
            if group.count == 1 {
                ordered.append(group[0])
                continue
            }
            let mini = miniTable(ids: Set(group.map(\.teamId)), matches: matches)
            group.sort { x, y in
                guard let mx = mini[x.teamId], let my = mini[y.teamId] else {
                    return x.teamId < y.teamId
                }
                if mx.points != my.points { return mx.points > my.points }
                if mx.gd != my.gd { return mx.gd > my.gd }
                if mx.gf != my.gf { return mx.gf > my.gf }
                if x.gd != y.gd { return x.gd > y.gd }
                if x.gf != y.gf { return x.gf > y.gf }
                return x.teamId < y.teamId
            }
            ordered.append(contentsOf: group)
        }

        return ordered.map { row in
            var copy = row
            copy.form = Array(row.form.suffix(5))
            return copy
        }
    }

    static func scorers(players: [Player]) -> [ScorerRow] {
        players
            .filter { ($0.goals ?? 0) > 0 }
            .map { ScorerRow(player: $0, goals: $0.goals ?? 0, penalties: $0.penalties ?? 0) }
            .sorted { a, b in
                if a.goals != b.goals { return a.goals > b.goals }
                if a.penalties != b.penalties { return a.penalties < b.penalties }
                return a.player.name.localizedStandardCompare(b.player.name) == .orderedAscending
            }
    }

    private static func add(_ row: inout StandingRow, gf: Int, ga: Int) {
        row.played += 1
        row.gf += gf
        row.ga += ga
        if gf > ga {
            row.won += 1
            row.points += 3
            row.form.append("W")
        } else if gf < ga {
            row.lost += 1
            row.form.append("L")
        } else {
            row.drawn += 1
            row.points += 1
            row.form.append("D")
        }
    }

    private static func miniTable(ids: Set<String>, matches: [Match]) -> [String: StandingRow] {
        var rows = Dictionary(uniqueKeysWithValues: ids.map { ($0, StandingRow(teamId: $0)) })
        for match in matches {
            guard match.status == .finished, match.phase == .league else { continue }
            guard ids.contains(match.home), ids.contains(match.away) else { continue }
            guard var home = rows[match.home], var away = rows[match.away] else { continue }
            add(&home, gf: match.homeGoals, ga: match.awayGoals)
            add(&away, gf: match.awayGoals, ga: match.homeGoals)
            rows[match.home] = home
            rows[match.away] = away
        }
        return rows
    }
}

struct Tie: Identifiable {
    let home: String
    let away: String
    let legs: [Match]
    let aggHome: Int
    let aggAway: Int
    let penHome: Int?
    let penAway: Int?
    let winner: String?

    var id: String { "\(home)-\(away)" }

    static func make(first: Match, second: Match?) -> Tie {
        let legs = second.map { [first, $0] } ?? [first]
        func aggregate(_ team: String) -> Int {
            legs.reduce(0) { total, match in
                total + (match.home == team ? match.homeGoals : match.awayGoals)
            }
        }
        let penLeg = legs.first { $0.penalty != nil }
        func penalties(_ team: String) -> Int? {
            guard let match = penLeg, let penalty = match.penalty, penalty.count == 2 else { return nil }
            return match.home == team ? penalty[0] : penalty[1]
        }
        let aggHome = aggregate(first.home)
        let aggAway = aggregate(first.away)
        let penHome = penalties(first.home)
        let penAway = penalties(first.away)
        let finished = legs.allSatisfy { $0.status == .finished }
        var winner: String?
        if finished {
            if aggHome != aggAway {
                winner = aggHome > aggAway ? first.home : first.away
            } else if let ph = penHome, let pa = penAway, ph != pa {
                winner = ph > pa ? first.home : first.away
            }
        }
        return Tie(
            home: first.home,
            away: first.away,
            legs: legs,
            aggHome: aggHome,
            aggAway: aggAway,
            penHome: penHome,
            penAway: penAway,
            winner: winner
        )
    }

    static func stageTies(matches: [Match], firstRound: Int, secondRound: Int) -> [Tie] {
        let firsts = matches.filter { $0.phase == .knockout && $0.round == firstRound }
        let seconds = matches.filter { $0.phase == .knockout && $0.round == secondRound }
        return firsts.map { first in
            let second = seconds.first { candidate in
                (candidate.home == first.home && candidate.away == first.away) ||
                (candidate.home == first.away && candidate.away == first.home)
            }
            return Tie.make(first: first, second: second)
        }
    }
}
