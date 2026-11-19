import Foundation

enum VoteChoice: String, Codable, CaseIterable, Hashable {
    case home
    case draw
    case away

    var label: String {
        switch self {
        case .home: return "主胜"
        case .draw: return "平局"
        case .away: return "客胜"
        }
    }
}

struct FanUser: Codable, Identifiable, Hashable {
    let id: String
    let nickname: String
    let createdAt: String
}

struct AuthResponse: Codable {
    let token: String
    let user: FanUser
}

struct VoteCounts: Codable, Hashable {
    let home: Int
    let draw: Int
    let away: Int
    let total: Int

    func count(for choice: VoteChoice) -> Int {
        switch choice {
        case .home: return home
        case .draw: return draw
        case .away: return away
        }
    }

    func share(for choice: VoteChoice) -> Double {
        guard total > 0 else { return 0 }
        return Double(count(for: choice)) / Double(total)
    }
}

struct VoteSummary: Codable, Identifiable, Hashable {
    var id: String { matchId }
    let matchId: String
    let counts: VoteCounts
    let mine: VoteChoice?
    let locked: Bool
}

struct TeamCheer: Codable, Identifiable, Hashable {
    var id: String { teamId }
    let teamId: String
    let count: Int
}

struct LeaderRow: Codable, Identifiable, Hashable {
    var id: String { "\(rank)-\(nickname)" }
    let rank: Int
    let nickname: String
    let points: Int
    let correct: Int
    let total: Int
    let isMe: Bool
}

struct FanPreferences: Codable, Equatable {
    var favouriteTeam: String?
    var reminders: [String]
}

struct MeProfile: Codable {
    var user: FanUser
    var points: Int
    var rank: Int?
    var correct: Int
    var total: Int
    var cheersToday: Int
    var cheersRemaining: Int
    var votes: [String: VoteChoice]
    var preferences: FanPreferences
}

struct BoardResponse: Codable {
    let teams: [TeamCheer]
    let leaderboard: [LeaderRow]
    let me: MeProfile?
    let votes: [String: VoteSummary]
}

struct CheerResponse: Codable {
    let teamId: String
    let count: Int
    let cheersToday: Int
    let cheersRemaining: Int
}
