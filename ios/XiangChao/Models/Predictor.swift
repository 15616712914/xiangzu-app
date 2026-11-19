import Foundation

enum Outcome: String, CaseIterable, Hashable {
    case home
    case draw
    case away
}

struct Prediction {
    let xg: (Double, Double)
    let probs: [Outcome: Double]
    let pick: Outcome
    let predicted: (Int, Int)
    let likely: [(score: (Int, Int), probability: Double)]
    let over25: Double
    let btts: Double
    let confidence: String
    let sample: Int
    let factors: [String]
    let summary: String
}

struct Backtest {
    let total: Int
    let hits: Int
    let exact: Int

    var rate: Double { total > 0 ? Double(hits) / Double(total) : 0 }
}

enum Predictor {
    private struct Rating {
        let attack: Double
        let defense: Double
        let played: Int
        let gfPer: Double
        let gaPer: Double
        let form: [String]
    }

    private static let homeAdvantage = 1.12
    private static let priorGames = 3.0
    private static let baseGoals = 1.3
    private static let maxGoals = 8

    static func predict(
        _ match: Match,
        liveMinute: Int? = nil,
        all matches: [Match],
        teams: [TeamInfo] = TeamInfo.all
    ) -> Prediction {
        let prior = finishedBefore(match, all: matches)
        let (ratings, average) = ratings(from: prior, teams: teams)
        let homeRating = ratings[match.home] ?? Rating(
            attack: 1, defense: 1, played: 0, gfPer: 0, gaPer: 0, form: []
        )
        let awayRating = ratings[match.away] ?? Rating(
            attack: 1, defense: 1, played: 0, gfPer: 0, gaPer: 0, form: []
        )

        let xgHome = average * homeRating.attack * awayRating.defense * homeAdvantage
        let xgAway = average * awayRating.attack * homeRating.defense

        let inPlay = match.status == .live && liveMinute != nil
        let remaining = inPlay ? max(0, 90 - Double(liveMinute ?? 0)) / 90 : 1
        let currentHome = inPlay ? match.homeGoals : 0
        let currentAway = inPlay ? match.awayGoals : 0

        let homePMF = pmf(xgHome * remaining)
        let awayPMF = pmf(xgAway * remaining)

        var probs: [Outcome: Double] = [.home: 0, .draw: 0, .away: 0]
        var over25 = 0.0
        var btts = 0.0
        var cells: [(score: (Int, Int), probability: Double)] = []

        for homeGoals in 0...maxGoals {
            for awayGoals in 0...maxGoals {
                let probability = homePMF[homeGoals] * awayPMF[awayGoals]
                let finalHome = currentHome + homeGoals
                let finalAway = currentAway + awayGoals
                if finalHome > finalAway {
                    probs[.home, default: 0] += probability
                } else if finalHome < finalAway {
                    probs[.away, default: 0] += probability
                } else {
                    probs[.draw, default: 0] += probability
                }
                if Double(finalHome + finalAway) > 2.5 { over25 += probability }
                if finalHome > 0 && finalAway > 0 { btts += probability }
                cells.append(((finalHome, finalAway), probability))
            }
        }

        let total = probs.values.reduce(0, +)
        if total > 0 {
            for key in probs.keys { probs[key]! /= total }
        }
        over25 /= max(total, 0.0001)
        btts /= max(total, 0.0001)

        cells.sort { $0.probability > $1.probability }
        let likely = Array(cells.prefix(3))

        var pick: Outcome = .home
        for key in Outcome.allCases where (probs[key] ?? 0) > (probs[pick] ?? 0) {
            pick = key
        }
        let predicted = cells.first { outcome(of: $0.score) == pick }?.score ?? (1, 1)
        let top = probs[pick] ?? 0
        let sample = min(homeRating.played, awayRating.played)
        let confidence: String
        if sample < 3 {
            confidence = "低"
        } else if top > 0.55 {
            confidence = "高"
        } else if top > 0.42 {
            confidence = "中"
        } else {
            confidence = "低"
        }

        let home = TeamInfo.map[match.home] ?? TeamInfo.all[0]
        let away = TeamInfo.map[match.away] ?? TeamInfo.all[0]
        let favourite = pick == .home ? home : pick == .away ? away : nil

        var factors: [String] = []
        if sample > 0 {
            factors.append("\(home.city)\(formText(homeRating.form))")
            factors.append("\(away.city)\(formText(awayRating.form))")
            let attackHome = rank(of: match.home, ratings: ratings, key: .goalsFor)
            let attackAway = rank(of: match.away, ratings: ratings, key: .goalsFor)
            let attack = attackHome <= attackAway
                ? (home, homeRating, attackHome)
                : (away, awayRating, attackAway)
            factors.append("\(attack.0.city)场均进球 \(String(format: "%.1f", attack.1.gfPer))，进攻排名第\(attack.2)")
            let defenseHome = rank(of: match.home, ratings: ratings, key: .goalsAgainst)
            let defenseAway = rank(of: match.away, ratings: ratings, key: .goalsAgainst)
            let defense = defenseHome <= defenseAway
                ? (home, homeRating, defenseHome)
                : (away, awayRating, defenseAway)
            factors.append("\(defense.0.city)场均失球 \(String(format: "%.1f", defense.1.gaPer))，防守排名第\(defense.2)")
        }
        factors.append("\(home.city)坐镇\(home.stadium)，享有主场优势")

        let predictedHome = predicted.0
        let predictedAway = predicted.1
        let summary: String
        if inPlay {
            let percentage = Int((top * 100).rounded())
            let lead = favourite.map { "\($0.city)最终取胜的概率为 \(percentage)%" }
                ?? "双方最终握手言和的概率最高（\(percentage)%）"
            summary = "比赛进行到第\(liveMinute ?? 0)分钟，场上比分 \(currentHome):\(currentAway)。按剩余时间推算，\(lead)，预测终场比分 \(predictedHome):\(predictedAway)。"
        } else if sample == 0 {
            summary = "赛季首轮缺少历史数据，模型以联赛平均水平和主场优势进行估算，\(home.city)稍被看好，预测比分 \(predictedHome):\(predictedAway)。"
        } else {
            let tone = top > 0.55 ? "占据明显优势" : top > 0.44 ? "略占上风" : "仅有微弱优势"
            let percentage = Int((top * 100).rounded())
            let lead = favourite.map { "模型认为\($0.city)\(tone)，取胜概率 \(percentage)%。" }
                ?? "双方实力接近，平局是最可能的结果（\(percentage)%）。"
            let attackText: String
            if xgHome + xgAway > 2.7 {
                attackText = "两队预期进球合计较高，可能是一场对攻战"
            } else if xgHome + xgAway < 2.1 {
                attackText = "两队预期进球偏低，比赛或将陷入胶着"
            } else {
                attackText = "预期进球处于联赛平均水平"
            }
            let tail = confidence == "低" ? "由于双方差距不大，本场存在较大不确定性。" : ""
            summary = "\(lead)\(attackText)，预测比分 \(predictedHome):\(predictedAway)。\(tail)"
        }

        return Prediction(
            xg: (xgHome, xgAway),
            probs: probs,
            pick: pick,
            predicted: predicted,
            likely: likely,
            over25: over25,
            btts: btts,
            confidence: confidence,
            sample: sample,
            factors: factors,
            summary: summary
        )
    }

    static func backtest(matches: [Match], teams: [TeamInfo] = TeamInfo.all) -> Backtest {
        let finished = matches.filter { $0.status == .finished }
        var hits = 0
        var exact = 0
        for match in finished {
            let prediction = predict(match, all: matches, teams: teams)
            if prediction.pick == actualOutcome(match) { hits += 1 }
            if prediction.predicted.0 == match.homeGoals && prediction.predicted.1 == match.awayGoals {
                exact += 1
            }
        }
        return Backtest(total: finished.count, hits: hits, exact: exact)
    }

    static func actualOutcome(_ match: Match) -> Outcome {
        if match.homeGoals > match.awayGoals { return .home }
        if match.homeGoals < match.awayGoals { return .away }
        return .draw
    }

    private static func finishedBefore(_ match: Match, all: [Match]) -> [Match] {
        all.filter { candidate in
            candidate.status == .finished &&
            (candidate.date < match.date || (candidate.date == match.date && candidate.time < match.time))
        }
    }

    private static func ratings(
        from matches: [Match],
        teams: [TeamInfo]
    ) -> ([String: Rating], Double) {
        var accumulated: [String: (gf: Int, ga: Int, played: Int, form: [String])] = [:]
        for team in teams {
            accumulated[team.id] = (0, 0, 0, [])
        }
        var goals = 0
        for match in matches {
            goals += match.homeGoals + match.awayGoals
            guard var home = accumulated[match.home], var away = accumulated[match.away] else { continue }
            home.gf += match.homeGoals
            home.ga += match.awayGoals
            home.played += 1
            away.gf += match.awayGoals
            away.ga += match.homeGoals
            away.played += 1
            home.form.append(match.homeGoals > match.awayGoals ? "W" : match.homeGoals < match.awayGoals ? "L" : "D")
            away.form.append(match.awayGoals > match.homeGoals ? "W" : match.awayGoals < match.homeGoals ? "L" : "D")
            accumulated[match.home] = home
            accumulated[match.away] = away
        }

        let average = (Double(goals) + baseGoals * 2 * priorGames) /
            (Double(matches.count) * 2 + 2 * priorGames)
        var ratings: [String: Rating] = [:]
        for (id, team) in accumulated {
            let form = Array(team.form.suffix(5))
            let pointsPerGame: Double
            if form.isEmpty {
                pointsPerGame = 1.4
            } else {
                let points = form.reduce(0) { $0 + ($1 == "W" ? 3 : $1 == "D" ? 1 : 0) }
                pointsPerGame = Double(points) / Double(form.count)
            }
            let attack = ((Double(team.gf) + priorGames * average) / (Double(team.played) + priorGames) / average) *
                (1 + 0.05 * (pointsPerGame - 1.4))
            let defense = (Double(team.ga) + priorGames * average) / (Double(team.played) + priorGames) / average
            ratings[id] = Rating(
                attack: attack,
                defense: defense,
                played: team.played,
                gfPer: team.played > 0 ? Double(team.gf) / Double(team.played) : 0,
                gaPer: team.played > 0 ? Double(team.ga) / Double(team.played) : 0,
                form: form
            )
        }
        return (ratings, average)
    }

    private static func pmf(_ lambda: Double) -> [Double] {
        var values: [Double] = []
        var probability = exp(-lambda)
        for goal in 0...maxGoals {
            values.append(probability)
            probability = probability * lambda / Double(goal + 1)
        }
        return values
    }

    private enum RankKey {
        case goalsFor
        case goalsAgainst
    }

    private static func rank(of teamId: String, ratings: [String: Rating], key: RankKey) -> Int {
        let sorted = ratings
            .filter { $0.value.played > 0 }
            .sorted { a, b in
                switch key {
                case .goalsFor: return a.value.gfPer > b.value.gfPer
                case .goalsAgainst: return a.value.gaPer < b.value.gaPer
                }
            }
        return (sorted.firstIndex { $0.key == teamId } ?? -1) + 1
    }

    private static func formText(_ form: [String]) -> String {
        let wins = form.filter { $0 == "W" }.count
        let draws = form.filter { $0 == "D" }.count
        let losses = form.count - wins - draws
        return "近\(form.count)场 \(wins)胜\(draws)平\(losses)负"
    }

    private static func outcome(of score: (Int, Int)) -> Outcome {
        if score.0 > score.1 { return .home }
        if score.0 < score.1 { return .away }
        return .draw
    }
}
