import AuthenticationServices
import SwiftUI

struct AppleLoginButton: View {
    @EnvironmentObject private var fan: FanStore
    var onSuccess: () -> Void = {}

    var body: some View {
        SignInWithAppleButton(.signIn) { request in
            request.requestedScopes = [.fullName]
        } onCompletion: { result in
            switch result {
            case .success(let authorization):
                guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                      let data = credential.identityToken,
                      let identityToken = String(data: data, encoding: .utf8) else {
                    fan.errorMessage = "未能获取 Apple 登录凭证，请重试。"
                    return
                }
                let formatter = PersonNameComponentsFormatter()
                let nickname = credential.fullName.map { formatter.string(from: $0) } ?? ""
                Task {
                    if await fan.loginWithApple(identityToken: identityToken, nickname: nickname) {
                        onSuccess()
                    }
                }
            case .failure(let error):
                if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                    return
                }
                fan.errorMessage = "Apple 登录失败：\(error.localizedDescription)"
            }
        }
        .signInWithAppleButtonStyle(.white)
        .frame(height: 50)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct AccountSheet: View {
    @EnvironmentObject private var fan: FanStore
    @Environment(\.dismiss) private var dismiss
    @State private var nickname = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Theme.chili)
                            Text("湘")
                                .appFont(size: 26, weight: .black, design: .serif)
                                .foregroundStyle(Theme.paper)
                        }
                        .frame(width: 48, height: 48)

                        VStack(alignment: .leading, spacing: 3) {
                            Text("登录\(Brand.name)")
                                .font(.display(24))
                                .foregroundStyle(Theme.ink)
                            Text("参与赛果投票、城市助威和排行榜")
                                .appFont(size: 11)
                                .foregroundStyle(Theme.muted)
                        }
                    }

                    Text("账号仅用于记录投票、助威和积分。昵称会显示在预测排行榜；不发送评论，不投放广告。你可以随时在「我的」中注销账号并删除全部数据。")
                        .appFont(size: 12)
                        .foregroundStyle(Theme.ink.opacity(0.7))
                        .lineSpacing(4)

                    AppleLoginButton { dismiss() }

                    #if DEBUG
                    if fan.isLocalDev {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("本地开发登录")
                                .appFont(size: 11, weight: .bold)
                                .foregroundStyle(Theme.muted)

                            TextField("昵称（选填）", text: $nickname)
                                .appFont(size: 14)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Theme.paper)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                            Button {
                                Task {
                                    if await fan.devLogin(nickname: nickname) {
                                        dismiss()
                                    }
                                }
                            } label: {
                                Text("开发登录（仅调试）")
                                    .appFont(size: 13, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 11)
                                    .background(Theme.gold.opacity(0.25))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                            .buttonStyle(.plain)
                            .disabled(fan.busy)

                            Text("服务：\(AppConfig.apiBaseURL.absoluteString)")
                                .appFont(size: 9)
                                .foregroundStyle(Theme.muted)
                        }
                    }
                    #endif

                    if let error = fan.errorMessage {
                        Text(error)
                            .appFont(size: 11)
                            .foregroundStyle(Theme.chili)
                    }

                    NavigationLink("查看隐私政策与数据来源") {
                        PrivacyView()
                    }
                    .appFont(size: 11, weight: .semibold)
                    .foregroundStyle(Theme.chili)

                    Text("继续即表示你同意隐私政策。积分仅用于球迷排行榜，不可兑换现金，不构成投注建议。")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)

                    Spacer(minLength: 8)
                }
                .padding(20)
            }
            .background(Theme.paper)
            .navigationTitle("账号")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                        .foregroundStyle(Theme.ink)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .preferredColorScheme(.light)
    }
}
