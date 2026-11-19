import SwiftUI
import UIKit

struct PosterView: View {
    @EnvironmentObject private var store: SeasonStore
    let matchId: String

    @State private var posterImage: UIImage?
    @State private var errorText: String?

    var body: some View {
        Group {
            if let match = store.match(id: matchId) {
                content(match)
            } else {
                ContentUnavailableView("比赛不存在", systemImage: "questionmark.circle")
            }
        }
    }

    private func content(_ match: Match) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                PosterCanvas(match: match, prediction: store.prediction(for: match))
                    .frame(width: 360, height: 590)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 18, y: 8)

                if let posterImage {
                    ShareLink(
                        item: Image(uiImage: posterImage),
                        preview: SharePreview(
                            "\(Brand.name) · \(TeamInfo.map[match.home]?.city ?? match.home) vs \(TeamInfo.map[match.away]?.city ?? match.away)",
                            image: Image(uiImage: posterImage)
                        )
                    ) {
                        Label("分享海报", systemImage: "square.and.arrow.up")
                            .appFont(size: 14, weight: .semibold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Theme.chili)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                } else {
                    ProgressView()
                        .padding(.vertical, 12)
                }

                if let errorText {
                    Text(errorText)
                        .appFont(size: 10)
                        .foregroundStyle(Theme.chili)
                }

                Text("海报在本地生成，不上传任何数据。模型推演仅供娱乐，不构成投注建议。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
            }
            .padding(20)
            .padding(.bottom, 100)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.paper)
        .navigationTitle("生成海报")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .task(id: matchId) {
            render(match)
        }
    }

    @MainActor
    private func render(_ match: Match) {
        let renderer = ImageRenderer(
            content: PosterCanvas(match: match, prediction: store.prediction(for: match))
                .frame(width: 360, height: 590)
        )
        renderer.scale = 2
        guard let image = renderer.uiImage else {
            errorText = "海报生成失败，请稍后重试。"
            return
        }
        posterImage = image
    }
}

private struct PosterCanvas: View {
    let match: Match
    let prediction: Prediction

    private var home: TeamInfo { TeamInfo.map[match.home] ?? TeamInfo.all[0] }
    private var away: TeamInfo { TeamInfo.map[match.away] ?? TeamInfo.all[0] }

    var body: some View {
        ZStack {
            Theme.ink

            RadialGradient(
                colors: [home.color.opacity(0.75), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 300
            )
            RadialGradient(
                colors: [away.color.opacity(0.65), .clear],
                center: .bottomTrailing,
                startRadius: 0,
                endRadius: 320
            )

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Theme.chili)
                        Text("湘")
                            .appFont(size: 25, weight: .black, design: .serif)
                            .foregroundStyle(.white)
                    }
                    .frame(width: 42, height: 42)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(Brand.name)
                            .appFont(size: 23, weight: .black, design: .serif)
                            .foregroundStyle(.white)
                        Text("湖南省足球联赛 · 2026")
                            .appFont(size: 9, weight: .medium)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    Spacer()
                }

                Spacer(minLength: 18)

                Text(League.stageLabel(match))
                    .appFont(size: 11, weight: .bold)
                    .tracking(1.4)
                    .foregroundStyle(Theme.gold)

                Text("\(League.formatDate(match.date)) \(match.time)")
                    .appFont(size: 13, weight: .semibold, design: .rounded)
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.top, 4)

                HStack(alignment: .center, spacing: 0) {
                    teamColumn(home)
                    VStack(spacing: 6) {
                        if match.status == .upcoming {
                            Text("VS")
                                .appFont(size: 30, weight: .bold, design: .rounded)
                                .foregroundStyle(.white)
                        } else {
                            Text("\(match.homeGoals) : \(match.awayGoals)")
                                .font(.score(36))
                                .foregroundStyle(.white)
                        }
                        if let penalty = match.penalty, penalty.count == 2 {
                            Text("点球 \(penalty[0]):\(penalty[1])")
                                .appFont(size: 9, weight: .bold)
                                .foregroundStyle(Theme.gold)
                        }
                    }
                    .frame(width: 92)
                    teamColumn(away)
                }
                .padding(.top, 18)

                HStack(spacing: 5) {
                    Image(systemName: "mappin.and.ellipse")
                    Text(match.venue(or: home.stadium))
                    Spacer()
                    Text(match.status == .upcoming ? "未开赛" : "完场")
                }
                .appFont(size: 9)
                .foregroundStyle(.white.opacity(0.5))
                .padding(.top, 14)

                Spacer(minLength: 16)

                VStack(alignment: .leading, spacing: 7) {
                    HStack {
                        Text("模型推演")
                            .appFont(size: 10, weight: .bold)
                            .tracking(1.2)
                            .foregroundStyle(Theme.gold)
                        Spacer()
                        Text("置信度 \(prediction.confidence)")
                            .appFont(size: 8, weight: .semibold)
                            .foregroundStyle(.white.opacity(0.5))
                    }

                    HStack(alignment: .lastTextBaseline, spacing: 8) {
                        Text("预测比分")
                            .appFont(size: 9)
                            .foregroundStyle(.white.opacity(0.5))
                        Text("\(prediction.predicted.0) : \(prediction.predicted.1)")
                            .font(.score(22))
                            .foregroundStyle(.white)
                        Spacer()
                        Text("\(home.city)胜 \(Int((prediction.probs[.home] ?? 0) * 100))% · 平 \(Int((prediction.probs[.draw] ?? 0) * 100))% · \(away.city)胜 \(Int((prediction.probs[.away] ?? 0) * 100))%")
                            .appFont(size: 8)
                            .foregroundStyle(.white.opacity(0.55))
                    }

                    ProbabilityBar(
                        probs: prediction.probs,
                        homeColor: home.color,
                        awayColor: away.color,
                        height: 4
                    )
                }
                .padding(12)
                .background(.white.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Text("模型推演，仅供娱乐，不构成投注建议 · 数据以官方发布为准")
                    .appFont(size: 8)
                    .foregroundStyle(.white.opacity(0.35))
                    .padding(.top, 10)
            }
            .padding(24)
        }
    }

    private func teamColumn(_ team: TeamInfo) -> some View {
        VStack(spacing: 8) {
            CrestView(team: team, size: 72)
            Text(team.city)
                .appFont(size: 15, weight: .bold)
                .foregroundStyle(.white)
            Text(team.alias)
                .appFont(size: 9)
                .foregroundStyle(.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity)
    }
}
