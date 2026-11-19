import SwiftUI

struct PageHeader: View {
    let kicker: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Kicker(text: kicker)
            Text(title)
                .font(.display(30))
                .foregroundStyle(Theme.ink)
            Text(subtitle)
                .appFont(size: 12)
                .foregroundStyle(Theme.muted)
        }
        .padding(.top, 8)
    }
}
