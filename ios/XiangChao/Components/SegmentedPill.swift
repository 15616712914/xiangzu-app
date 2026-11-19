import SwiftUI

struct SegmentedPill<T: Hashable>: View {
    enum Style {
        case light
        case dark
    }

    let items: [T]
    let title: (T) -> String
    @Binding var selection: T
    var style: Style = .light
    @Namespace private var namespace

    private var containerBackground: Color {
        style == .dark ? Color.white.opacity(0.08) : Theme.card
    }

    private var containerStroke: Color {
        style == .dark ? Color.white.opacity(0.1) : Theme.hairline
    }

    private var selectedBackground: Color {
        style == .dark ? .white : Theme.ink
    }

    private var selectedForeground: Color {
        style == .dark ? Theme.ink : .white
    }

    private var unselectedForeground: Color {
        style == .dark ? .white.opacity(0.55) : Theme.muted
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(items, id: \.self) { item in
                Button {
                    withAnimation(.snappy(duration: 0.22)) {
                        selection = item
                    }
                } label: {
                    Text(title(item))
                        .appFont(size: 12, weight: selection == item ? .bold : .medium)
                        .foregroundStyle(selection == item ? selectedForeground : unselectedForeground)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background {
                            if selection == item {
                                Capsule()
                                    .fill(selectedBackground)
                                    .matchedGeometryEffect(id: "segment", in: namespace)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(containerBackground)
        .overlay(Capsule().stroke(containerStroke, lineWidth: 1))
        .clipShape(Capsule())
    }
}
