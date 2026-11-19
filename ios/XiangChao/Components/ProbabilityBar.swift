import SwiftUI

struct ProbabilityBar: View {
    let probs: [Outcome: Double]
    let homeColor: Color
    let awayColor: Color
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { geometry in
            let available = max(0, geometry.size.width - 4)
            HStack(spacing: 2) {
                segment(width: available * (probs[.home] ?? 0), color: homeColor)
                segment(width: available * (probs[.draw] ?? 0), color: Theme.muted)
                segment(width: available * (probs[.away] ?? 0), color: awayColor)
            }
            .frame(width: geometry.size.width, alignment: .leading)
        }
        .frame(height: height)
    }

    private func segment(width: CGFloat, color: Color) -> some View {
        RoundedRectangle(cornerRadius: height / 2, style: .continuous)
            .fill(color)
            .frame(width: max(1, width), height: height)
    }
}

struct ConfidenceBadge: View {
    let text: String

    var body: some View {
        Text("置信度\(text)")
            .appFont(size: 9, weight: .bold, design: .rounded)
            .foregroundStyle(text == "高" ? Theme.chili : Theme.muted)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background((text == "高" ? Theme.chili : Theme.muted).opacity(0.1))
            .clipShape(Capsule())
    }
}
