import AppKit
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else {
    fputs("cannot create context\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)

let rect = NSRect(x: 0, y: 0, width: size, height: size)
NSColor(calibratedRed: 0.784, green: 0.063, blue: 0.180, alpha: 1).setFill()
rect.fill()

let ring = NSBezierPath(ovalIn: rect.insetBy(dx: 118, dy: 118))
NSColor(calibratedRed: 0.890, green: 0.659, blue: 0.231, alpha: 1).setStroke()
ring.lineWidth = 16
ring.stroke()

let font = NSFont(name: "Songti SC Bold", size: 560)
    ?? NSFont(name: "STSong", size: 560)
    ?? NSFont.systemFont(ofSize: 560, weight: .black)
let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor(calibratedRed: 0.976, green: 0.949, blue: 0.890, alpha: 1),
]
let text = NSAttributedString(string: "湘", attributes: attrs)
let textSize = text.size()
text.draw(at: NSPoint(
    x: (CGFloat(size) - textSize.width) / 2,
    y: (CGFloat(size) - textSize.height) / 2 + 18
))

NSGraphicsContext.restoreGraphicsState()

guard let image = ctx.makeImage() else { exit(1) }
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "AppIcon.png"
let url = URL(fileURLWithPath: out)
guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    exit(1)
}
CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }
print("wrote \(out)")
