import SwiftUI

struct StripeTexture: View {
    var opacity: Double = 1

    var body: some View {
        Canvas { context, size in
            var path = Path()
            let spacing: CGFloat = 14
            var x = -size.height
            while x < size.width {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x + size.height, y: size.height))
                x += spacing
            }
            context.stroke(path, with: .color(.white.opacity(0.035 * opacity)), lineWidth: 1)
        }
        .allowsHitTesting(false)
    }
}
