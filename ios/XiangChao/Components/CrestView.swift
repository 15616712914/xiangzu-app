import SwiftUI

struct CrestView: View {
    let team: TeamInfo
    var size: CGFloat = 40

    var body: some View {
        ShieldCrest(team: team, size: size)
            .frame(width: size, height: size)
        .shadow(color: .black.opacity(0.14), radius: max(1, size * 0.04), y: max(1, size * 0.02))
    }
}

private struct ShieldCrest: View {
    let team: TeamInfo
    let size: CGFloat

    var body: some View {
        ZStack {
            ShieldShape()
                .fill(team.color)
            ShieldShape()
                .fill(
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.18)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            ShieldBand()
                .fill(team.accent.opacity(0.9))
            ShieldShape()
                .stroke(.white.opacity(0.35), lineWidth: max(1, size * 0.03))

            Text(team.short)
                .appFont(size: size * 0.38, weight: .black)
                .foregroundStyle(team.crestText)
                .shadow(color: .black.opacity(0.22), radius: max(0.5, size * 0.02), y: 1)
                .offset(y: -size * 0.03)
        }
    }
}

private struct ShieldShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 40
        let sy = rect.height / 44
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }

        var path = Path()
        path.move(to: point(20, 1))
        path.addLine(to: point(38, 6))
        path.addLine(to: point(38, 22))
        path.addCurve(to: point(20, 43), control1: point(38, 33), control2: point(30, 40))
        path.addCurve(to: point(2, 22), control1: point(10, 40), control2: point(2, 33))
        path.addLine(to: point(2, 6))
        path.closeSubpath()
        return path
    }
}

private struct ShieldBand: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 40
        let sy = rect.height / 44
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }

        var path = Path()
        path.move(to: point(2, 30))
        path.addLine(to: point(38, 16))
        path.addLine(to: point(38, 20))
        path.addLine(to: point(3.6, 33.5))
        path.closeSubpath()
        return path
    }
}
