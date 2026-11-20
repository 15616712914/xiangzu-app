import XCTest
@testable import XiangChao

final class FoundationTests: XCTestCase {
    private func match(
        id: String,
        date: String,
        home: String,
        away: String,
        homeGoals: Int,
        awayGoals: Int,
        status: MatchStatus = .finished,
        phase: MatchPhase = .league,
        round: Int = 1,
        time: String = "19:30",
        penalty: [Int]? = nil
    ) -> Match {
        Match(
            id: id,
            round: round,
            phase: phase,
            stage: nil,
            leg: nil,
            date: date,
            time: time,
            home: home,
            away: away,
            status: status,
            homeGoals: homeGoals,
            awayGoals: awayGoals,
            venue: nil,
            penalty: penalty,
            startMinute: nil,
            attendance: nil
        )
    }

    func testStandingsUsesLeagueMatchesOnlyAndOrdersByPoints() {
        let matches = [
            match(id: "1", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 2, awayGoals: 0),
            match(id: "2", date: "2026-01-02", home: "zz", away: "cs", homeGoals: 1, awayGoals: 1),
            match(id: "3", date: "2026-01-03", home: "yz", away: "zz", homeGoals: 3, awayGoals: 2),
            match(id: "4", date: "2026-01-04", home: "cs", away: "yz", homeGoals: 4, awayGoals: 0, phase: .knockout, round: 14),
        ]
        let rows = League.standings(matches: matches)
        XCTAssertEqual(rows.first?.teamId, "cs")
        XCTAssertEqual(rows.first?.played, 2)
        XCTAssertEqual(rows.first?.points, 4)
        XCTAssertEqual(rows.first(where: { $0.teamId == "yz" })?.played, 2)
    }

    func testScorersSortByGoalsThenPenalties() {
        let players = [
            Player(id: "a", teamId: "cs", number: 9, name: "甲", position: nil, appearances: nil, goals: 3, penalties: 1, yellow: 0, red: 0),
            Player(id: "b", teamId: "yz", number: 10, name: "乙", position: nil, appearances: nil, goals: 3, penalties: 0, yellow: 0, red: 0),
            Player(id: "c", teamId: "zz", number: 7, name: "丙", position: nil, appearances: nil, goals: 0, penalties: 0, yellow: 0, red: 0),
        ]
        let rows = League.scorers(players: players)
        XCTAssertEqual(rows.map(\.player.id), ["b", "a"])
    }

    func testTwoLegTieAndPenaltyWinner() {
        let first = match(id: "leg1", date: "2026-11-01", home: "hy", away: "ld", homeGoals: 1, awayGoals: 0, phase: .knockout, round: 15)
        let second = match(id: "leg2", date: "2026-11-08", home: "ld", away: "hy", homeGoals: 2, awayGoals: 1, phase: .knockout, round: 15, penalty: [7, 6])
        let tie = Tie.make(first: first, second: second)
        XCTAssertEqual(tie.aggHome, 2)
        XCTAssertEqual(tie.aggAway, 2)
        XCTAssertEqual(tie.winner, "ld")
        XCTAssertEqual(tie.penHome, 6)
        XCTAssertEqual(tie.penAway, 7)
    }

    func testPredictionProbabilitiesNormalize() {
        let history = [
            match(id: "h1", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 2, awayGoals: 0),
            match(id: "h2", date: "2026-01-02", home: "yz", away: "cs", homeGoals: 1, awayGoals: 1),
            match(id: "h3", date: "2026-01-03", home: "cs", away: "zz", homeGoals: 3, awayGoals: 1),
            match(id: "h4", date: "2026-01-04", home: "zz", away: "yz", homeGoals: 0, awayGoals: 2),
        ]
        let upcoming = match(id: "next", date: "2026-02-01", home: "cs", away: "yz", homeGoals: 0, awayGoals: 0, status: .upcoming)
        let prediction = Predictor.predict(upcoming, all: history + [upcoming])
        let total = prediction.probs.values.reduce(0, +)
        XCTAssertEqual(total, 1, accuracy: 0.001)
        XCTAssertEqual(prediction.predicted.0 > prediction.predicted.1, prediction.pick == .home)
        XCTAssertEqual(prediction.predicted.0 < prediction.predicted.1, prediction.pick == .away)
    }

    func testResultChoiceOnlyForFinishedMatches() {
        let finished = match(id: "f", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 2, awayGoals: 1)
        XCTAssertEqual(finished.resultChoice, .home)
        XCTAssertEqual(match(id: "l", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 1, awayGoals: 3).resultChoice, .away)
        XCTAssertEqual(match(id: "d", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 0, awayGoals: 0).resultChoice, .draw)

        let upcoming = match(id: "u", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 0, awayGoals: 0, status: .upcoming)
        XCTAssertNil(upcoming.resultChoice)
        let live = match(id: "lv", date: "2026-01-01", home: "cs", away: "yz", homeGoals: 1, awayGoals: 0, status: .live)
        XCTAssertNil(live.resultChoice)
    }

    func testNotificationMatchId() {
        XCTAssertEqual(NotificationManager.matchId(from: ["matchId": "m736237"]), "m736237")
        XCTAssertNil(NotificationManager.matchId(from: [:]))
        XCTAssertNil(NotificationManager.matchId(from: ["matchId": 42]))
        XCTAssertEqual(NotificationManager.matchId(fromIdentifier: "xiangchao.match.m736237"), "m736237")
        XCTAssertNil(NotificationManager.matchId(fromIdentifier: "other.m736237"))
    }

    func testDayChipLabel() {
        XCTAssertEqual(League.dayChipLabel(League.todayString), "今天")
        XCTAssertEqual(League.dayChipLabel("2027-03-05"), "3/5")
        XCTAssertEqual(League.dayChipLabel("bad"), "bad")
    }

    func testLocalCacheRoundTrip() {
        let league = RemoteLeague(updatedAt: "2026-11-19T00:00:00Z", matches: [], squads: [:])
        let name = "test-\(UUID().uuidString).json"
        LocalCache.save(league, name: name)
        let loaded = LocalCache.load(RemoteLeague.self, name: name)
        XCTAssertEqual(loaded?.updatedAt, league.updatedAt)
        XCTAssertEqual(loaded?.matches.count, 0)
    }
}
