import SwiftUI

struct MeView: View {
    @EnvironmentObject private var store: SeasonStore
    @EnvironmentObject private var fan: FanStore
    @State private var showDelete = false
    @State private var showRename = false
    @State private var draftNickname = ""
    @State private var showTeamPicker = false

    var body: some View {
        VStack(spacing: 0) {
            PageHero(
                kicker: "My Xiangchao",
                title: "我的",
                subtitle: "主队、开赛提醒与数据说明"
            )

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    profile
                    accountCard
                    favouriteCard
                    reminders
                    more
                    Text("本 App 为球迷数据工具，与赛事主办方无隶属关系。赛事数据来自官方公开渠道，一切以官方发布为准；模型推演仅供娱乐，不构成投注建议。")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)
                        .padding(.horizontal, 4)
                }
                .padding(.horizontal, 18)
                .padding(.top, 24)
                .padding(.bottom, 100)
            }
            .background(Theme.paper)
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 28,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 28,
                    style: .continuous
                )
            )
            .padding(.top, -22)
        }
        .background(Theme.paper)
        .toolbar(.hidden, for: .navigationBar)
        .alert("提示", isPresented: Binding(
            get: { store.alertMessage != nil },
            set: { if !$0 { store.alertMessage = nil; store.alertOpensSettings = false } }
        )) {
            if store.alertOpensSettings {
                Button("打开设置") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
            Button("知道了", role: .cancel) {}
        } message: {
            Text(store.alertMessage ?? "")
        }
        .confirmationDialog("注销账号？", isPresented: $showDelete, titleVisibility: .visible) {
            Button("注销并删除全部数据", role: .destructive) {
                Task { await fan.deleteAccount() }
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("将删除服务器上的昵称、投票和助威记录，且无法恢复。")
        }
        .sheet(isPresented: $showTeamPicker) {
            TeamPickerSheet(selected: store.favTeam) { teamId in
                store.favTeam = teamId
                showTeamPicker = false
            }
            .environmentObject(store)
        }
    }

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("账号", kicker: "Account")

            if fan.isLoggedIn, let user = fan.user {
                HStack(spacing: 10) {
                    ZStack {
                        Circle().fill(Theme.chili)
                        Text("湘")
                            .appFont(size: 16, weight: .black, design: .serif)
                            .foregroundStyle(Theme.paper)
                    }
                    .frame(width: 34, height: 34)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.nickname)
                            .appFont(size: 14, weight: .bold)
                            .foregroundStyle(Theme.ink)
                        Text("\(fan.me?.points ?? 0) 积分 · \(fan.me?.rank.map { "第\($0)名" } ?? "暂无排名")")
                            .appFont(size: 10)
                            .foregroundStyle(Theme.muted)
                        Text("昵称会公开显示在排行榜")
                            .appFont(size: 9)
                            .foregroundStyle(Theme.muted.opacity(0.8))
                    }

                    Spacer()

                    HStack(spacing: 12) {
                        Button("改昵称") {
                            draftNickname = user.nickname
                            showRename = true
                        }
                        .appFont(size: 11, weight: .semibold)
                        .foregroundStyle(Theme.muted)
                        .buttonStyle(.plain)

                        Button("退出") { Task { await fan.logout() } }
                            .appFont(size: 11, weight: .semibold)
                            .foregroundStyle(Theme.muted)
                            .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)

                Divider().background(Theme.hairline)

                Button {
                    showDelete = true
                } label: {
                    HStack {
                        Text("注销账号并删除数据")
                            .appFont(size: 11)
                            .foregroundStyle(Theme.chili)
                        Spacer()
                        Image(systemName: "trash")
                            .appFont(size: 10)
                            .foregroundStyle(Theme.chili.opacity(0.7))
                    }
                    .padding(.vertical, 6)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                        .appFont(size: 18)
                        .foregroundStyle(Theme.gold)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("登录后参与赛果投票")
                            .appFont(size: 13, weight: .semibold)
                            .foregroundStyle(Theme.ink)
                        Text("无需手机号 · 可随时注销")
                            .appFont(size: 10)
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer()
                    Button("登录") { fan.showLogin = true }
                        .appFont(size: 11, weight: .semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Theme.chili)
                        .clipShape(Capsule())
                        .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .alert("修改昵称", isPresented: $showRename) {
            TextField("昵称", text: $draftNickname)
            Button("保存") {
                Task { await fan.updateNickname(draftNickname) }
            }
            Button("取消", role: .cancel) {}
        } message: {
            Text("昵称会显示在预测排行榜，最多 16 个字符。")
        }
    }

    private var profile: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Theme.chili)
                Text("湘")
                    .appFont(size: 26, weight: .black, design: .serif)
                    .foregroundStyle(Theme.paper)
            }
            .frame(width: 46, height: 46)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(Brand.name) 2026")
                    .appFont(size: 16, weight: .bold)
                    .foregroundStyle(Theme.ink)
                Text("赛事数据只读 · 登录后参与投票")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
            }
            Spacer()
        }
        .card(padding: 14)
    }

    private var favouriteCard: some View {
        let fav = store.favTeam.flatMap { TeamInfo.map[$0] }

        return VStack(alignment: .leading, spacing: 10) {
            SectionHeader("我的主队", kicker: "My Club") {
                Button(fav == nil ? "选择" : "更换") {
                    showTeamPicker = true
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Theme.muted)
                .buttonStyle(.plain)
            }

            if let fav {
                Button {
                    showTeamPicker = true
                } label: {
                    HStack(spacing: 12) {
                        CrestView(team: fav, size: 46)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(fav.city)队")
                                .font(.display(20))
                                .foregroundStyle(.white)
                            Text("主场 · \(fav.stadium)")
                                .appFont(size: 10)
                                .foregroundStyle(.white.opacity(0.65))
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .appFont(size: 11, weight: .semibold)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .padding(14)
                    .background(
                        ZStack {
                            Theme.ink
                            RadialGradient(
                                colors: [fav.color.opacity(0.72), .clear],
                                center: .topTrailing,
                                startRadius: 10,
                                endRadius: 280
                            )
                        }
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(.white.opacity(0.08), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
            } else {
                Button {
                    showTeamPicker = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "plus.circle.fill")
                            .appFont(size: 20)
                            .foregroundStyle(Theme.chili)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("选择一支城市球队")
                                .appFont(size: 13, weight: .semibold)
                                .foregroundStyle(Theme.ink)
                            Text("首页会置顶它的下一场比赛")
                                .appFont(size: 10)
                                .foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .appFont(size: 11, weight: .semibold)
                            .foregroundStyle(Theme.ink.opacity(0.25))
                    }
                    .card(padding: 14)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var reminders: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("开赛提醒", kicker: "Reminders") {
                NavigationLink(value: Route.reminders) {
                    Text("全部")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                }
            }

            VStack(spacing: 0) {
                if store.activeReminders.isEmpty {
                    Text("还没有加入提醒的比赛。可在比赛详情页加入，开赛前 30 分钟提醒。")
                        .appFont(size: 11)
                        .foregroundStyle(Theme.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 10)
                } else {
                    ForEach(store.activeReminders) { match in
                        NavigationLink(value: Route.match(match.id)) {
                            HStack(spacing: 10) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(TeamInfo.map[match.home]?.city ?? match.home) vs \(TeamInfo.map[match.away]?.city ?? match.away)")
                                        .appFont(size: 13, weight: .semibold)
                                        .foregroundStyle(Theme.ink)
                                    Text("\(League.formatDate(match.date)) \(match.time)")
                                        .appFont(size: 10)
                                        .foregroundStyle(Theme.muted)
                                }
                                Spacer()
                                Image(systemName: "bell.fill")
                                    .appFont(size: 12)
                                    .foregroundStyle(Theme.chili)
                            }
                            .padding(.vertical, 10)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        if match.id != store.activeReminders.last?.id {
                            Divider().background(Theme.hairline)
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var more: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("更多", kicker: "More")

            VStack(spacing: 0) {
                NavigationLink(value: Route.messages) {
                    row(icon: "bell", title: "消息中心", badge: store.unreadCount)
                }
                .buttonStyle(.plain)

                Divider().background(Theme.hairline)

                NavigationLink(value: Route.notificationSettings) {
                    row(icon: "bell.badge", title: "通知设置")
                }
                .buttonStyle(.plain)

                Divider().background(Theme.hairline)

                NavigationLink(value: Route.privacy) {
                    row(icon: "doc.text", title: "隐私、协议与数据来源")
                }
                .buttonStyle(.plain)

                Divider().background(Theme.hairline)

                HStack {
                    row(icon: "info.circle", title: "关于\(Brand.name)")
                    Text("v\(AppConfig.appVersion)")
                        .appFont(size: 10)
                        .foregroundStyle(Theme.muted)
                }
                .padding(.vertical, 11)
            }
            .padding(.horizontal, 14)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func row(icon: String, title: String, badge: Int = 0) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .appFont(size: 13)
                .foregroundStyle(Theme.ink.opacity(0.5))
                .frame(width: 18)
            Text(title)
                .appFont(size: 14)
                .foregroundStyle(Theme.ink)
            Spacer()
            if badge > 0 {
                CountBadge(count: badge)
            }
            Image(systemName: "chevron.right")
                .appFont(size: 11, weight: .semibold)
                .foregroundStyle(Theme.ink.opacity(0.22))
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

struct MessagesView: View {
    @EnvironmentObject private var store: SeasonStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(spacing: 0) {
                    if store.notifications.isEmpty {
                        VStack(spacing: 8) {
                            Image(systemName: "bell.slash")
                                .appFont(size: 20)
                                .foregroundStyle(Theme.muted.opacity(0.6))
                            Text("暂时没有待开赛的比赛提醒。")
                                .appFont(size: 12)
                                .foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 22)
                    } else {
                        ForEach(store.notifications) { item in
                            NavigationLink(value: Route.match(item.matchId)) {
                                HStack(alignment: .top, spacing: 10) {
                                    ZStack(alignment: .topTrailing) {
                                        Image(systemName: "bell")
                                            .appFont(size: 13)
                                            .foregroundStyle(Theme.ink.opacity(0.55))
                                            .frame(width: 30, height: 30)
                                            .background(Theme.paper)
                                            .clipShape(Circle())
                                        if !store.readNotifs.contains(item.id) {
                                            Circle()
                                                .fill(Theme.chili)
                                                .frame(width: 6, height: 6)
                                                .offset(x: 1, y: -1)
                                        }
                                    }

                                    VStack(alignment: .leading, spacing: 3) {
                                        HStack {
                                            Text(item.title)
                                                .appFont(size: 13, weight: store.readNotifs.contains(item.id) ? .medium : .bold)
                                                .foregroundStyle(Theme.ink)
                                            Spacer()
                                            Text(item.time)
                                                .appFont(size: 9)
                                                .foregroundStyle(Theme.muted)
                                        }
                                        Text(item.body)
                                            .appFont(size: 11)
                                            .foregroundStyle(Theme.muted)
                                            .multilineTextAlignment(.leading)
                                    }
                                }
                                .padding(.vertical, 11)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .simultaneousGesture(TapGesture().onEnded { store.markRead(item.id) })

                            if item.id != store.notifications.last?.id {
                                Divider().background(Theme.hairline)
                            }
                        }
                    }
                }
                .padding(.horizontal, 14)
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Text("提醒由本机根据真实赛程生成；通知权限开启后，会在开赛前 30 分钟提醒。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 4)
            }
            .padding(18)
            .padding(.bottom, 100)
        }
        .background(Theme.paper)
        .navigationTitle("消息中心")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
    }
}

struct PrivacyView: View {
    private struct Section: Identifiable {
        let id = UUID()
        let title: String
        let body: String
    }

    private let sections: [Section] = [
        Section(
            title: "一、我们收集什么",
            body: "不登录也可以浏览全部赛程和榜单。只有你主动登录后，我们才会保存 Apple 提供的用户标识和可选昵称，以及你的赛果投票、助威记录和排行榜积分。不收集手机号、通讯录、位置、广告标识，也不接入第三方统计。"
        ),
        Section(
            title: "二、账号与排行榜",
            body: "账号仅用于赛果投票、城市助威和预测排行榜。登录后，你选择的主队和开赛提醒会与服务器同步，方便换设备恢复；投票和助威记录用于计算票数、城市助威榜和积分排名，排行榜会公开显示你的昵称和积分。没有评论、私信或其他用户生成内容。账号数据保留到你主动注销。"
        ),
        Section(
            title: "三、通知",
            body: "只有你主动加入开赛提醒并允许系统通知后，App 才会在比赛开始前 30 分钟发送本地通知。通知由系统在本机生成，不经过服务器。可随时在比赛详情或系统设置中关闭。"
        ),
        Section(
            title: "四、第三方服务",
            body: "登录使用 Sign in with Apple，由 Apple 完成身份验证，我们只接收用于识别账号的用户标识和可选昵称。App 不接入广告、支付、定位、第三方统计或外部 AI 服务。"
        ),
        Section(
            title: "五、赛事数据与免责声明",
            body: "赛程、比分、积分、射手榜与名单来自赛事官方公开渠道，更新可能有延迟，一切以赛事官方发布为准。本地模型推演仅供娱乐，不构成任何投注建议。投票仅用于球迷互动，不涉及投注、奖金或兑换。本 App 与赛事主办方无隶属关系。"
        ),
        Section(
            title: "六、你的权利",
            body: "你可以在「我的」或「球迷」页面注销账号，服务器会删除你的昵称、投票、助威、积分、主队和提醒记录，且无法恢复；已读状态仍只保存在本机，删除 App 即可清除。"
        ),
        Section(
            title: "七、联系我们",
            body: "如对数据来源或隐私有疑问，可通过 App Store 产品页的开发者联系方式反馈；涉及官方数据的更正，请以赛事官方渠道为准。"
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("\(Brand.name) App 隐私说明")
                    .font(.display(24))
                    .foregroundStyle(Theme.ink)
                Text("更新日期：2026年11月")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)

                VStack(alignment: .leading, spacing: 14) {
                    ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(section.title)
                                .appFont(size: 13, weight: .bold)
                                .foregroundStyle(Theme.ink)
                            Text(section.body)
                                .appFont(size: 12)
                                .foregroundStyle(Theme.ink.opacity(0.7))
                                .lineSpacing(4)
                        }
                        if index < sections.count - 1 {
                            Divider().background(Theme.hairline)
                        }
                    }
                }
                .card(padding: 16)

                Text("数据来源：足球中国 / 湖南省足球联赛公开信息。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
            }
            .padding(18)
            .padding(.bottom, 100)
        }
        .background(Theme.paper)
        .navigationTitle("隐私与数据来源")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
    }
}

struct RemindersView: View {
    @EnvironmentObject private var store: SeasonStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if store.activeReminders.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "bell.slash")
                            .appFont(size: 22)
                            .foregroundStyle(Theme.muted.opacity(0.6))
                        Text("还没有加入提醒的比赛。打开任意未开赛的比赛，点击「加入提醒」。")
                            .appFont(size: 12)
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .card(padding: 18)
                } else {
                    VStack(spacing: 0) {
                        ForEach(store.activeReminders) { match in
                            HStack(spacing: 10) {
                                NavigationLink(value: Route.match(match.id)) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("\(TeamInfo.map[match.home]?.city ?? match.home) vs \(TeamInfo.map[match.away]?.city ?? match.away)")
                                            .appFont(size: 14, weight: .semibold)
                                            .foregroundStyle(Theme.ink)
                                        Text("\(League.stageLabel(match)) · \(League.formatDate(match.date)) \(match.time)")
                                            .appFont(size: 10)
                                            .foregroundStyle(Theme.muted)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)

                                Button {
                                    Task { await store.toggleReminder(match) }
                                } label: {
                                    Image(systemName: "bell.slash")
                                        .appFont(size: 13)
                                        .foregroundStyle(Theme.chili)
                                        .frame(width: 34, height: 34)
                                        .background(Theme.chili.opacity(0.1))
                                        .clipShape(Circle())
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.vertical, 10)

                            if match.id != store.activeReminders.last?.id {
                                Divider().background(Theme.hairline)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .background(Theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }

                Text("开赛提醒为本地通知，会在比赛开始前 30 分钟提醒。若关闭了系统通知权限，提醒不会送达。")
                    .appFont(size: 10)
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)
            }
            .padding(18)
            .padding(.bottom, 100)
        }
        .background(Theme.paper)
        .navigationTitle("开赛提醒")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .alert("提示", isPresented: Binding(
            get: { store.alertMessage != nil },
            set: { if !$0 { store.alertMessage = nil; store.alertOpensSettings = false } }
        )) {
            if store.alertOpensSettings {
                Button("打开设置") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
            Button("知道了", role: .cancel) {}
        } message: {
            Text(store.alertMessage ?? "")
        }
    }
}


private struct TeamPickerSheet: View {
    @EnvironmentObject private var store: SeasonStore
    @Environment(\.dismiss) private var dismiss
    let selected: String?
    let onSelect: (String?) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(
                    columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3),
                    spacing: 10
                ) {
                    ForEach(store.teams) { team in
                        Button {
                            onSelect(team.id)
                        } label: {
                            VStack(spacing: 7) {
                                CrestView(team: team, size: 38)
                                Text(team.city)
                                    .appFont(size: 12, weight: .semibold)
                                    .foregroundStyle(Theme.ink)
                                Text(team.alias)
                                    .appFont(size: 9)
                                    .foregroundStyle(Theme.muted)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(selected == team.id ? Theme.chili.opacity(0.1) : Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(selected == team.id ? Theme.chili.opacity(0.5) : Theme.hairline, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(18)

                if selected != nil {
                    Button("取消主队") {
                        onSelect(nil)
                    }
                    .appFont(size: 11, weight: .semibold)
                    .foregroundStyle(Theme.muted)
                    .padding(.bottom, 24)
                }
            }
            .background(Theme.paper)
            .navigationTitle("选择主队")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("关闭") { dismiss() }
                        .foregroundStyle(Theme.ink)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
