import Foundation

struct APIError: LocalizedError {
    let message: String
    let status: Int

    var errorDescription: String? { message }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

struct APIClient {
    var baseURL: URL
    var token: String?
    var devToken: String?

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        config.waitsForConnectivity = false
        return URLSession(configuration: config)
    }()

    func send<T: Decodable>(
        _ path: String,
        method: HTTPMethod = .get,
        body: [String: Any]? = nil,
        authenticated: Bool = true,
        devToken: String? = nil,
        timeout: TimeInterval = 15
    ) async throws -> T {
        let request = try makeRequest(
            path,
            method: method,
            body: body,
            authenticated: authenticated,
            devToken: devToken,
            timeout: timeout
        )
        let (data, response) = try await Self.session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "服务响应异常", status: 0)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw error(from: data, status: http.statusCode)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError(message: "数据格式异常，请稍后重试", status: http.statusCode)
        }
    }

    func sendNoContent(
        _ path: String,
        method: HTTPMethod,
        authenticated: Bool = true,
        timeout: TimeInterval = 15
    ) async throws {
        let request = try makeRequest(
            path,
            method: method,
            body: nil,
            authenticated: authenticated,
            devToken: nil,
            timeout: timeout
        )
        let (data, response) = try await Self.session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "服务响应异常", status: 0)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw error(from: data, status: http.statusCode)
        }
    }

    private func makeRequest(
        _ path: String,
        method: HTTPMethod,
        body: [String: Any]?,
        authenticated: Bool,
        devToken: String?,
        timeout: TimeInterval
    ) throws -> URLRequest {
        let base = baseURL.absoluteString.hasSuffix("/")
            ? String(baseURL.absoluteString.dropLast())
            : baseURL.absoluteString
        guard let url = URL(string: base + path) else {
            throw APIError(message: "服务地址无效", status: 0)
        }
        var request = URLRequest(url: url, timeoutInterval: timeout)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        if authenticated, let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let effectiveDevToken = devToken ?? self.devToken {
            request.setValue(effectiveDevToken, forHTTPHeaderField: "X-Dev-Token")
        }
        return request
    }

    private func error(from data: Data, status: Int) -> APIError {
        let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            ?? (status == 503 ? "服务暂未开放" : "请求失败（\(status)）")
        if status == 401 {
            return APIError(message: "登录已过期，请重新登录", status: 401)
        }
        return APIError(message: message, status: status)
    }
}

private struct ErrorBody: Decodable {
    let error: String?
}
