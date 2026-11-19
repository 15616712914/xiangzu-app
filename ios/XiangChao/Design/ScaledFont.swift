import SwiftUI

private struct ScaledAppFont: ViewModifier {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let size: CGFloat
    let weight: Font.Weight
    let design: Font.Design

    private var scale: CGFloat {
        switch dynamicTypeSize {
        case .xSmall: return 0.9
        case .small: return 0.95
        case .medium: return 1.0
        case .large: return 1.0
        case .xLarge: return 1.08
        case .xxLarge: return 1.16
        case .xxxLarge: return 1.24
        case .accessibility1: return 1.32
        case .accessibility2: return 1.4
        case .accessibility3: return 1.48
        case .accessibility4: return 1.56
        case .accessibility5: return 1.64
        @unknown default: return 1.0
        }
    }

    func body(content: Content) -> some View {
        content.font(.system(size: size * scale, weight: weight, design: design))
    }
}

extension View {
    /// Fixed-size design type that still follows the user's Dynamic Type setting.
    func appFont(
        size: CGFloat,
        weight: Font.Weight = .regular,
        design: Font.Design = .default
    ) -> some View {
        modifier(ScaledAppFont(size: size, weight: weight, design: design))
    }
}
