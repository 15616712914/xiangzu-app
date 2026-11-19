import Foundation

struct RemoteLeague: Codable {
    let updatedAt: String?
    let matches: [Match]
    let squads: [String: [Player]]
}

struct SeasonAPI {
    private let client: APIClient

    init(baseURL: URL) {
        client = APIClient(baseURL: baseURL)
    }

    func league() async throws -> RemoteLeague {
        try await client.send("/api/league", authenticated: false, timeout: 10)
    }
}
