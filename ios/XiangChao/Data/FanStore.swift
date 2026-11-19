import Foundation
import SwiftUI

@MainActor
final class FanStore: ObservableObject {
    @Published private(set) var user: FanUser?
    @Published private(set) var me: MeProfile?
    @Published private(set) var board: BoardResponse?
    @Published private(set) var voteCache: [String: VoteSummary] = [:]
    @Published private(set) var loading = false
    @Published private(set) var busy = false
    @Published var errorMessage: String?
    @Published var showLogin = false

    private var api = FanAPI(baseURL: AppConfig.apiBaseURL)
    private var token: String?

    init() {
        token = Keychain.read("fanToken")
        api.token = token
        Task { await refresh() }
    }

    var isLoggedIn: Bool { token != nil && user != nil }
    var isLocalDev: Bool { AppConfig.isLocalAPI }
    var remainingCheers: Int { me?.cheersRemaining ?? 0 }
    var cheersToday: Int { me?.cheersToday ?? 0 }

    func refresh() async {
        loading = true
        defer { loading = false }
        do {
            let board = try await api.board()
            self.board = board
            self.me = board.me
            self.user = board.me?.user
            for (id, summary) in board.votes {
                voteCache[id] = summary
            }
            if token != nil && board.me == nil {
                clearSession()
            }
            errorMessage = nil
        } catch {
            errorMessage = friendly(error)
        }
    }

    func loginWithApple(identityToken: String, nickname: String) async -> Bool {
        busy = true
        defer { busy = false }
        do {
            let auth = try await api.appleLogin(identityToken: identityToken, nickname: nickname)
            complete(auth)
            return true
        } catch {
            errorMessage = friendly(error)
            return false
        }
    }

    func devLogin(nickname: String) async -> Bool {
        busy = true
        defer { busy = false }
        do {
            let auth = try await api.devLogin(deviceId: devDeviceId, nickname: nickname)
            complete(auth)
            return true
        } catch {
            errorMessage = friendly(error)
            return false
        }
    }

    func updatePreferences(favouriteTeam: String?, reminders: [String]) async {
        guard token != nil else { return }
        do {
            let profile = try await api.updatePreferences(favouriteTeam: favouriteTeam, reminders: reminders)
            me = profile
            user = profile.user
        } catch {
            // Keep local settings; the next local change or login retries.
        }
    }

    func updateNickname(_ nickname: String) async {
        busy = true
        defer { busy = false }
        do {
            let updated = try await api.updateNickname(nickname)
            user = updated
            if var profile = me {
                profile.user = updated
                me = profile
            }
            errorMessage = nil
        } catch {
            errorMessage = friendly(error)
        }
    }

    func logout() async {
        await api.logout()
        clearSession()
        await refresh()
    }

    func deleteAccount() async -> Bool {
        busy = true
        defer { busy = false }
        do {
            try await api.deleteAccount()
            clearSession()
            await refresh()
            return true
        } catch {
            errorMessage = friendly(error)
            return false
        }
    }

    func vote(matchId: String, choice: VoteChoice) async {
        guard token != nil else {
            showLogin = true
            return
        }
        busy = true
        defer { busy = false }
        do {
            let summary = try await api.vote(matchId: matchId, choice: choice)
            voteCache[matchId] = summary
            if let board {
                var votes = board.votes
                votes[matchId] = summary
                self.board = BoardResponse(
                    teams: board.teams,
                    leaderboard: board.leaderboard,
                    me: board.me,
                    votes: votes
                )
            }
            if var profile = me {
                profile.votes[matchId] = choice
                me = profile
            }
            Analytics.track(.vote, properties: ["match": matchId, "choice": choice.rawValue])
            errorMessage = nil
        } catch {
            errorMessage = friendly(error)
        }
    }

    func cheer(teamId: String) async {
        guard token != nil else {
            showLogin = true
            return
        }
        busy = true
        defer { busy = false }
        do {
            let result = try await api.cheer(teamId: teamId)
            if let board {
                let teams = board.teams.map { item in
                    item.teamId == teamId ? TeamCheer(teamId: teamId, count: result.count) : item
                }
                self.board = BoardResponse(
                    teams: teams,
                    leaderboard: board.leaderboard,
                    me: board.me,
                    votes: board.votes
                )
            }
            if var profile = me {
                profile.cheersToday = result.cheersToday
                profile.cheersRemaining = result.cheersRemaining
                me = profile
            }
            Analytics.track(.cheer, properties: ["team": teamId])
            errorMessage = nil
        } catch {
            errorMessage = friendly(error)
        }
    }

    func loadVote(matchId: String) async {
        if voteCache[matchId] != nil { return }
        do {
            voteCache[matchId] = try await api.voteSummary(matchId: matchId)
        } catch {
            // Summary is optional; keep the panel usable offline.
        }
    }

    func summary(for matchId: String) -> VoteSummary? {
        voteCache[matchId]
    }

    func vote(for matchId: String) -> VoteChoice? {
        me?.votes[matchId]
    }

    private func complete(_ auth: AuthResponse) {
        token = auth.token
        api.token = auth.token
        Keychain.save(auth.token, key: "fanToken")
        user = auth.user
        errorMessage = nil
        Task { await refresh() }
    }

    private func clearSession() {
        token = nil
        api.token = nil
        Keychain.delete("fanToken")
        user = nil
        me = nil
        voteCache = [:]
    }

    private var devDeviceId: String {
        if let existing = Keychain.read("fanDeviceId") { return existing }
        let id = UUID().uuidString
        Keychain.save(id, key: "fanDeviceId")
        return id
    }

    private func friendly(_ error: Error) -> String {
        if let apiError = error as? APIError {
            if apiError.status == 401 {
                clearSession()
                return "登录已过期，请重新登录"
            }
            return apiError.message
        }
        if error is URLError {
            return "无法连接服务。请确认服务端已启动，或稍后再试。"
        }
        return error.localizedDescription
    }
}
