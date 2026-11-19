import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case home = "首页"
    case data = "数据"
    case bracket = "对阵"
    case fans = "球迷"
    case me = "我的"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .home: return "house.fill"
        case .data: return "chart.bar.fill"
        case .bracket: return "trophy.fill"
        case .fans: return "megaphone.fill"
        case .me: return "person.fill"
        }
    }
}

struct CustomTabBar: View {
    @Binding var selection: AppTab
    @Namespace private var namespace

    var body: some View {
        HStack(spacing: 2) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    withAnimation(.snappy(duration: 0.22)) {
                        selection = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .appFont(size: 14, weight: .semibold)
                        Text(tab.rawValue)
                            .appFont(size: 9, weight: selection == tab ? .bold : .medium)
                    }
                    .foregroundStyle(selection == tab ? Color.white : Theme.mutedOnInk)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background {
                        if selection == tab {
                            Capsule()
                                .fill(Theme.chili)
                                .matchedGeometryEffect(id: "tab", in: namespace)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.rawValue)
                .accessibilityAddTraits(selection == tab ? .isSelected : [])
            }
        }
        .padding(6)
        .background(
            Capsule()
                .fill(Theme.ink)
                .overlay(Capsule().stroke(.white.opacity(0.08), lineWidth: 1))
                .shadow(color: .black.opacity(0.22), radius: 18, y: 8)
        )
    }
}
