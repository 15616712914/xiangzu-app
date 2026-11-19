import Foundation

struct FanAPI {
    private var client: APIClient

    var token: String? {
        get { client.token }
        set { client.token = newValue }
    }

    init(baseURL: URL, token: String? = nil) {
        client = APIClient(baseURL: baseURL, token: token)
    }

    func me() async throws -> MeProfile {
        try await client.send("/api/fans/me")
    }

    func board() async throws -> BoardResponse {
        try await client.send("/api/fans/board")
    }

    func vote(matchId: String, choice: VoteChoice) async throws -> VoteSummary {
        try await client.send(
            "/api/fans/votes",
            method: .post,
            body: ["matchId": matchId, "choice": choice.rawValue]
        )
    }

    func voteSummary(matchId: String) async throws -> VoteSummary {
        try await client.send("/api/fans/votes/\(matchId)")
    }

    func cheer(teamId: String) async throws -> CheerResponse {
        try await client.send("/api/fans/cheers", method: .post, body: ["teamId": teamId])
    }

    func devLogin(deviceId: String, nickname: String) async throws -> AuthResponse {
        try await client.send(
            "/api/auth/dev",
            method: .post,
            body: ["deviceId": deviceId, "nickname": nickname],
            devToken: "dev-only"
        )
    }

    func appleLogin(identityToken: String, nickname: String) async throws -> AuthResponse {
        try await client.send(
            "/api/auth/apple",
            method: .post,
            body: ["identityToken": identityToken, "nickname": nickname],
            authenticated: false
        )
    }

    func updatePreferences(favouriteTeam: String?, reminders: [String]) async throws -> MeProfile {
        try await client.send(
            "/api/fans/preferences",
            method: .patch,
            body: [
                "favouriteTeam": favouriteTeam ?? NSNull(),
                "reminders": reminders,
            ]
        )
    }

    func updateNickname(_ nickname: String) async throws -> FanUser {
        try await client.send("/api/fans/me", method: .patch, body: ["nickname": nickname])
    }

    func logout() async {
        try? await client.sendNoContent("/api/fans/logout", method: .post)
    }

    func deleteAccount() async throws {
        try await client.sendNoContent("/api/fans/me", method: .delete)
    }
}
