import SwiftUI

struct SectionHeader<Trailing: View>: View {
    let title: String
    var kicker: String?
    let trailing: Trailing

    init(_ title: String, kicker: String? = nil, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.kicker = kicker
        self.trailing = trailing()
    }

    var body: some View {
        HStack(alignment: .lastTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                if let kicker {
                    Text(kicker.uppercased())
                        .appFont(size: 10, weight: .bold, design: .rounded)
                        .tracking(1.4)
                        .foregroundStyle(Theme.gold)
                }
                Text(title)
                    .font(.display(21))
                    .foregroundStyle(Theme.ink)
            }
            Spacer(minLength: 8)
            trailing
                .font(.caption.weight(.semibold))
                .foregroundStyle(Theme.muted)
        }
    }
}

extension SectionHeader where Trailing == EmptyView {
    init(_ title: String, kicker: String? = nil) {
        self.init(title, kicker: kicker) { EmptyView() }
    }
}

struct Kicker: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .appFont(size: 10, weight: .bold, design: .rounded)
            .tracking(1.6)
            .foregroundStyle(Theme.gold)
    }
}

struct CountBadge: View {
    let count: Int

    var body: some View {
        Text("\(count)")
            .appFont(size: 10, weight: .bold, design: .rounded)
            .foregroundStyle(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Theme.chili)
            .clipShape(Capsule())
    }
}
