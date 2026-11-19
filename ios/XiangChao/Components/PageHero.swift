import SwiftUI

struct PageHero<Content: View>: View {
    let kicker: String
    let title: String
    let subtitle: String
    @ViewBuilder let content: () -> Content

    init(
        kicker: String,
        title: String,
        subtitle: String,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.kicker = kicker
        self.title = title
        self.subtitle = subtitle
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Kicker(text: kicker)
                Text(title)
                    .font(.display(30))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .appFont(size: 12)
                    .foregroundStyle(.white.opacity(0.55))
            }

            content()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 30)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            ZStack {
                Theme.ink
                RadialGradient(
                    colors: [Theme.chili.opacity(0.4), .clear],
                    center: .topTrailing,
                    startRadius: 20,
                    endRadius: 360
                )
                RadialGradient(
                    colors: [Theme.gold.opacity(0.12), .clear],
                    center: .bottomLeading,
                    startRadius: 0,
                    endRadius: 280
                )
                StripeTexture(opacity: 0.7)
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}

extension PageHero where Content == EmptyView {
    init(kicker: String, title: String, subtitle: String) {
        self.init(kicker: kicker, title: title, subtitle: subtitle) { EmptyView() }
    }
}
