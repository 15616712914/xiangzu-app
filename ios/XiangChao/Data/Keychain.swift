import Foundation
import Security

enum Keychain {
    private static let service = "com.xiangchao.fans"

    static func save(_ value: String, key: String) {
        delete(key)
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
            kSecValueData as String: data,
        ]
        SecItemAdd(query as CFDictionary, nil)
        #if DEBUG
        // Unsigned simulator builds can lose Keychain access between installs; keep debug sessions usable.
        UserDefaults.standard.set(value, forKey: "debug.keychain.\(key)")
        #endif
    }

    static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data {
            return String(data: data, encoding: .utf8)
        }
        #if DEBUG
        return UserDefaults.standard.string(forKey: "debug.keychain.\(key)")
        #else
        return nil
        #endif
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        #if DEBUG
        UserDefaults.standard.removeObject(forKey: "debug.keychain.\(key)")
        #endif
    }
}
