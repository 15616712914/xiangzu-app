import SwiftUI

struct OnboardingView: View {
    @ObservedObject var store: SeasonStore
    let onFinish: (String?) -> Void

    @State private var selected: String?
    @State private var enableReminders = true

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(Brand.tagline)
                            .appFont(size: 9, weight: .bold, design: .rounded)
                            .tracking(1.6)
                            .foregroundStyle(Theme.gold)
                        Text("你的城市，\n你的主队。")
                            .font(.display(34))
                            .foregroundStyle(.white)
                            .lineSpacing(2)
                        Text("选一支城市队，首页会置顶它的下一场比赛。之后可以在「我的」里随时更换。")
                            .appFont(size: 12)
                            .foregroundStyle(.white.opacity(0.55))
                            .lineSpacing(4)
                    }
                    .padding(.top, 20)

                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                        spacing: 10
                    ) {
                        ForEach(store.teams) { team in
                            Button {
                                selected = team.id
                            } label: {
                                HStack(spacing: 10) {
                                    CrestView(team: team, size: 38)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(team.city)
                                            .appFont(size: 15, weight: .bold)
                                            .foregroundStyle(.white)
                                        Text(team.alias)
                                            .appFont(size: 9)
                                            .foregroundStyle(.white.opacity(0.45))
                                    }
                                    Spacer(minLength: 0)
                                    if selected == team.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .appFont(size: 16)
                                            .foregroundStyle(team.color)
                                    }
                                }
                                .padding(12)
                                .background(.white.opacity(selected == team.id ? 0.12 : 0.05))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .stroke(
                                            selected == team.id ? team.color : .white.opacity(0.06),
                                            lineWidth: selected == team.id ? 1.5 : 1
                                        )
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }

            VStack(spacing: 10) {
                Toggle(isOn: $enableReminders) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("开赛前提醒")
                            .appFont(size: 12, weight: .semibold)
                            .foregroundStyle(.white)
                        Text("比赛前 30 分钟通知，可随时关闭")
                            .appFont(size: 9)
                            .foregroundStyle(.white.opacity(0.45))
                    }
                }
                .tint(Theme.chili)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Button {
                    Task {
                        if selected != nil && enableReminders {
                            _ = await NotificationManager.shared.requestAuthorization()
                        }
                        onFinish(selected)
                    }
                } label: {
                    Text(selected == nil ? "选择一支球队开始" : "开始看球")
                        .appFont(size: 14, weight: .bold)
                        .foregroundStyle(selected == nil ? .white.opacity(0.35) : Theme.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(selected == nil ? Color.white.opacity(0.08) : .white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(selected == nil)

                Button("先逛逛") {
                    onFinish(nil)
                }
                .appFont(size: 11, weight: .medium)
                .foregroundStyle(.white.opacity(0.45))
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 20)
            .background(Theme.ink)
        }
        .background {
            ZStack {
                Theme.ink
                RadialGradient(
                    colors: [Theme.chili.opacity(0.35), .clear],
                    center: .topTrailing,
                    startRadius: 20,
                    endRadius: 420
                )
                StripeTexture(opacity: 0.7)
            }
            .ignoresSafeArea()
        }
        .preferredColorScheme(.dark)
        .onAppear {
            selected = store.favTeam
        }
        .onDisappear {
            AppWindowStyle.set(.dark)
        }
    }
}
