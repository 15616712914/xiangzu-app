import SwiftUI

enum Theme {
    static let ink = Color(hex: "#13100F")
    static let paper = Color(hex: "#F4EFE7")
    static let card = Color(hex: "#FFFDFB")
    static let chili = Color(hex: "#C21E1A")
    static let gold = Color(hex: "#C9A35C")
    /// Body-safe on paper/card (>= 4.5:1); use `mutedOnInk` on dark backgrounds.
    static let muted = Color(hex: "#6F6963")
    static let mutedOnInk = Color(hex: "#A79E96")
    static let hairline = Color.black.opacity(0.07)
    static let darkCard = Color(hex: "#1B1614")
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r, g, b, a: Double
        switch cleaned.count {
        case 8:
            r = Double((value >> 24) & 0xFF) / 255
            g = Double((value >> 16) & 0xFF) / 255
            b = Double((value >> 8) & 0xFF) / 255
            a = Double(value & 0xFF) / 255
        default:
            r = Double((value >> 16) & 0xFF) / 255
            g = Double((value >> 8) & 0xFF) / 255
            b = Double(value & 0xFF) / 255
            a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

extension Font {
    static func display(_ size: CGFloat) -> Font {
        .system(size: size, weight: .black, design: .default)
    }

    static func number(_ size: CGFloat) -> Font {
        .system(size: size, weight: .semibold, design: .default).monospacedDigit()
    }

    static func score(_ size: CGFloat) -> Font {
        .system(size: size, weight: .black, design: .default).italic().monospacedDigit()
    }
}

struct CardBackground: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Theme.ink.opacity(0.05), lineWidth: 1)
            )
            .shadow(color: Theme.ink.opacity(0.035), radius: 8, y: 2)
    }
}

extension View {
    func card(padding: CGFloat = 16) -> some View {
        modifier(CardBackground(padding: padding))
    }
}
