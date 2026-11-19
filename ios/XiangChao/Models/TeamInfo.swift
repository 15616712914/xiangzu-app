import SwiftUI

struct TeamInfo: Identifiable, Hashable {
    let id: String
    let city: String
    let alias: String
    let colorHex: String
    let accentHex: String
    let stadium: String
    let slogan: String
    let short: String

    var color: Color { Color(hex: colorHex) }
    var accent: Color { Color(hex: accentHex) }

    /// White text on dark kits, ink on light kits (常德粉、怀化金等).
    var crestText: Color {
        let hex = colorHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        return 0.299 * r + 0.587 * g + 0.114 * b > 0.62 ? Theme.ink : .white
    }

    // Team colors follow the official 2026 home-kit palette; the crest keeps its own multicolor artwork.
    static let all: [TeamInfo] = [
        TeamInfo(id: "cs", city: "长沙", alias: "星城", colorHex: "#C21E1A", accentHex: "#D4AF37", stadium: "长沙贺龙体育场", slogan: "星城不夜，越战越嗨", short: "长"),
        TeamInfo(id: "zz", city: "株洲", alias: "火车头", colorHex: "#BA2429", accentHex: "#E7E1D6", stadium: "株洲体育中心", slogan: "火车头一开，谁都拦不住", short: "株"),
        TeamInfo(id: "xt", city: "湘潭", alias: "莲城", colorHex: "#B01E28", accentHex: "#F2D6D0", stadium: "湘潭体育中心", slogan: "莲城有莲，球场有拳", short: "潭"),
        TeamInfo(id: "hy", city: "衡阳", alias: "雁城", colorHex: "#C21E1A", accentHex: "#D4AF37", stadium: "衡阳体育场", slogan: "雁阵齐飞，寿比南山", short: "衡"),
        TeamInfo(id: "sy", city: "邵阳", alias: "宝庆", colorHex: "#D9772B", accentHex: "#F2E3D0", stadium: "邵阳体育场", slogan: "宝庆霸得蛮，九十分钟不服输", short: "邵"),
        TeamInfo(id: "yy", city: "岳阳", alias: "巴陵", colorHex: "#C21E1A", accentHex: "#D4AF37", stadium: "岳阳奥体中心", slogan: "先天下之忧，后进球之乐", short: "岳"),
        TeamInfo(id: "cd", city: "常德", alias: "桃花源", colorHex: "#E07A96", accentHex: "#25568D", stadium: "常德体育中心", slogan: "一碗米粉，满场斗志", short: "常"),
        TeamInfo(id: "zjj", city: "张家界", alias: "武陵", colorHex: "#2E6B50", accentHex: "#A7D8C9", stadium: "张家界贺龙体育中心", slogan: "绝壁之上，也能破门", short: "张"),
        TeamInfo(id: "yiy", city: "益阳", alias: "银城", colorHex: "#2E7D4F", accentHex: "#D9E6C8", stadium: "益阳体育中心", slogan: "银城出品，越踢越醇", short: "益"),
        TeamInfo(id: "cz", city: "郴州", alias: "林城", colorHex: "#1E6B3A", accentHex: "#F2C230", stadium: "郴州体育中心", slogan: "雾漫东江，球进我网？不存在", short: "郴"),
        TeamInfo(id: "yz", city: "永州", alias: "潇湘", colorHex: "#1D5FA8", accentHex: "#F2F6FA", stadium: "永州体育场", slogan: "潇湘源头，奔流不息", short: "永"),
        TeamInfo(id: "hh", city: "怀化", alias: "鹤城", colorHex: "#C9A35C", accentHex: "#2B2B2B", stadium: "怀化体育中心", slogan: "鹤城一飞，冲天而起", short: "怀"),
        TeamInfo(id: "ld", city: "娄底", alias: "湘中", colorHex: "#C21E1A", accentHex: "#24476E", stadium: "娄底体育中心", slogan: "湘中腹地，硬核出击", short: "娄"),
        TeamInfo(id: "xx", city: "湘西", alias: "边城", colorHex: "#335C8A", accentHex: "#7FB6D9", stadium: "凤凰体育场", slogan: "边城少年，踢出远方", short: "西"),
    ]

    static let map: [String: TeamInfo] = Dictionary(
        uniqueKeysWithValues: all.map { ($0.id, $0) }
    )
}
