import Foundation

enum MatchStatus: String, Codable, Hashable {
    case finished
    case live
    case upcoming
}

enum MatchPhase: String, Codable, Hashable {
    case league
    case knockout
}

struct SeasonFile: Decodable {
    let season: Int
    let source: String
    let updatedAt: String
    let teams: [SeasonTeam]
    let matches: [Match]
    let squads: [String: [Player]]
}

struct SeasonTeam: Decodable, Identifiable, Hashable {
    let id: String
    let cfaId: Int
    let name: String
    let stadium: String
}

struct Match: Codable, Identifiable, Hashable {
    let id: String
    let round: Int
    let phase: MatchPhase
    let stage: String?
    let leg: Int?
    let date: String
    let time: String
    let home: String
    let away: String
    let status: MatchStatus
    let homeGoals: Int
    let awayGoals: Int
    let venue: String?
    let penalty: [Int]?
    let startMinute: Int?
    let attendance: Int?

    var score: (Int, Int) { (homeGoals, awayGoals) }
    var isUpcoming: Bool { status == .upcoming }
    var isFinished: Bool { status == .finished }
    var isLive: Bool { status == .live }

    var resultChoice: VoteChoice? {
        guard isFinished else { return nil }
        if homeGoals > awayGoals { return .home }
        if homeGoals < awayGoals { return .away }
        return .draw
    }

    var stateLabel: String {
        switch status {
        case .upcoming: return "未开赛"
        case .live: return "进行中"
        case .finished: return "完场"
        }
    }

    var shortDate: String {
        let parts = date.split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }

    var liveMinute: Int? {
        guard isLive else { return nil }
        if let startMinute {
            return max(0, min(90, startMinute))
        }
        guard let kickoff = League.kickoffDate(self) else { return nil }
        return max(0, min(90, Int(Date().timeIntervalSince(kickoff) / 60)))
    }

    var rowTimeLabel: String {
        switch status {
        case .upcoming: return time
        case .live: return liveMinute.map { "\($0)'" } ?? "进行中"
        case .finished: return "完场"
        }
    }

    var heroStatusLabel: String {
        switch status {
        case .upcoming: return "即将开赛"
        case .live: return "进行中"
        case .finished: return "完场"
        }
    }

    func venue(or fallback: String) -> String {
        guard let venue, !venue.isEmpty else { return fallback }
        return venue
    }
}

struct Player: Codable, Identifiable, Hashable {
    let id: String
    let teamId: String
    let number: Int
    let name: String
    let position: String?
    let appearances: Int?
    let goals: Int?
    let penalties: Int?
    let yellow: Int?
    let red: Int?

    var apps: Int { appearances ?? 0 }
    var goalCount: Int { goals ?? 0 }
    var penaltyCount: Int { penalties ?? 0 }
    var yellowCount: Int { yellow ?? 0 }
    var redCount: Int { red ?? 0 }
}

struct StandingRow: Identifiable, Hashable {
    var id: String { teamId }
    let teamId: String
    var played = 0
    var won = 0
    var drawn = 0
    var lost = 0
    var gf = 0
    var ga = 0
    var points = 0
    var form: [String] = []

    var gd: Int { gf - ga }
}

struct ScorerRow: Identifiable, Hashable {
    var id: String { player.id }
    let player: Player
    let goals: Int
    let penalties: Int
}
