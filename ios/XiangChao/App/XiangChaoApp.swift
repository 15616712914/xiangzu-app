import SwiftUI

enum Route: Hashable {
    case match(String)
    case team(String)
    case player(String)
    case poster(String)
    case bracket
    case search
    case reminders
    case messages
    case privacy
    case notificationSettings
}

struct RootView: View {
    @ObservedObject private var notifications = NotificationManager.shared
    @StateObject private var store = SeasonStore()
    @StateObject private var fanStore = FanStore()
    @AppStorage("xiangchao.onboarded") private var onboarded = false
    @State private var showOnboarding = false
    @State private var selection: AppTab = .home
    @State private var homePath = NavigationPath()
    @State private var dataPath = NavigationPath()
    @State private var bracketPath = NavigationPath()
    @State private var fansPath = NavigationPath()
    @State private var mePath = NavigationPath()

    var body: some View {
        ZStack {
            NavigationStack(path: $homePath) {
                HomeView()
                    .navigationDestination(for: Route.self, destination: destination)
            }
            .opacity(selection == .home ? 1 : 0)
            .allowsHitTesting(selection == .home)
            .zIndex(selection == .home ? 1 : 0)

            NavigationStack(path: $dataPath) {
                DataView()
                    .navigationDestination(for: Route.self, destination: destination)
            }
            .opacity(selection == .data ? 1 : 0)
            .allowsHitTesting(selection == .data)
            .zIndex(selection == .data ? 1 : 0)

            NavigationStack(path: $bracketPath) {
                BracketView(asTab: true)
                    .navigationDestination(for: Route.self, destination: destination)
            }
            .opacity(selection == .bracket ? 1 : 0)
            .allowsHitTesting(selection == .bracket)
            .zIndex(selection == .bracket ? 1 : 0)

            NavigationStack(path: $fansPath) {
                FansView()
                    .navigationDestination(for: Route.self, destination: destination)
            }
            .opacity(selection == .fans ? 1 : 0)
            .allowsHitTesting(selection == .fans)
            .zIndex(selection == .fans ? 1 : 0)

            NavigationStack(path: $mePath) {
                MeView()
                    .navigationDestination(for: Route.self, destination: destination)
            }
            .opacity(selection == .me ? 1 : 0)
            .allowsHitTesting(selection == .me)
            .zIndex(selection == .me ? 1 : 0)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            CustomTabBar(selection: $selection)
                .padding(.horizontal, 16)
                .padding(.top, 6)
                .padding(.bottom, 8)
                .background(Theme.paper.ignoresSafeArea(edges: .bottom))
        }
        .environmentObject(store)
        .environmentObject(fanStore)
        .tint(Theme.chili)
        .sheet(isPresented: $fanStore.showLogin) {
            AccountSheet()
                .environmentObject(fanStore)
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView(store: store) { teamId in
                if let teamId {
                    store.favTeam = teamId
                }
                onboarded = true
                showOnboarding = false
                Analytics.track(.onboardingComplete, properties: ["team": teamId ?? "skipped"])
                AppWindowStyle.set(.dark)
            }
        }
        .onAppear {
            updateWindowStyle()
            if !onboarded {
                showOnboarding = true
            }
            openPendingNotification()
        }
        .onChange(of: notifications.pendingMatchId) { _, _ in
            openPendingNotification()
        }
        .onChange(of: selection) { _, _ in updateWindowStyle() }
        .onChange(of: homePath.count) { _, _ in updateWindowStyle() }
        .onChange(of: dataPath.count) { _, _ in updateWindowStyle() }
        .onChange(of: bracketPath.count) { _, _ in updateWindowStyle() }
        .onChange(of: fansPath.count) { _, _ in updateWindowStyle() }
        .onChange(of: mePath.count) { _, _ in updateWindowStyle() }
        .onChange(of: fanStore.showLogin) { _, _ in updateWindowStyle() }
        .onChange(of: fanStore.me?.preferences) { _, preferences in
            guard let preferences else { return }
            applyPreferences(preferences)
        }
        .onChange(of: store.favTeam) { _, _ in syncPreferencesToServer() }
        .onChange(of: store.reminders) { _, _ in syncPreferencesToServer() }
    }

    private func openPendingNotification() {
        guard let matchId = notifications.pendingMatchId else { return }
        notifications.pendingMatchId = nil
        selection = .home
        homePath = NavigationPath()
        homePath.append(Route.match(matchId))
    }

    private func applyPreferences(_ preferences: FanPreferences) {
        if let favourite = preferences.favouriteTeam, store.favTeam != favourite {
            store.favTeam = favourite
        }
        let merged = Set(preferences.reminders).union(store.reminders)
        if merged != store.reminders {
            store.reminders = merged
        }
        if fanStore.isLoggedIn,
           store.favTeam != preferences.favouriteTeam || merged != Set(preferences.reminders) {
            Task {
                await fanStore.updatePreferences(
                    favouriteTeam: store.favTeam,
                    reminders: Array(merged)
                )
            }
        }
    }

    private func syncPreferencesToServer() {
        guard fanStore.isLoggedIn else { return }
        Task {
            await fanStore.updatePreferences(
                favouriteTeam: store.favTeam,
                reminders: Array(store.reminders)
            )
        }
    }

    private func updateWindowStyle() {
        let atRoot: Bool
        switch selection {
        case .home: atRoot = homePath.isEmpty
        case .data: atRoot = dataPath.isEmpty
        case .bracket: atRoot = bracketPath.isEmpty
        case .fans: atRoot = fansPath.isEmpty
        case .me: atRoot = mePath.isEmpty
        }
        AppWindowStyle.set(atRoot && !fanStore.showLogin ? .dark : .light)
    }

    @ViewBuilder
    private func destination(_ route: Route) -> some View {
        switch route {
        case .match(let id):
            MatchDetailView(matchId: id)
        case .team(let id):
            TeamView(teamId: id)
        case .player(let id):
            PlayerView(playerId: id)
        case .poster(let id):
            PosterView(matchId: id)
        case .bracket:
            BracketView()
        case .search:
            SearchView()
        case .reminders:
            RemindersView()
        case .messages:
            MessagesView()
        case .privacy:
            PrivacyView()
        case .notificationSettings:
            NotificationSettingsView()
        }
    }
}

@main
struct XiangChaoApp: App {
    init() {
        NotificationManager.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
