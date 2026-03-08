import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class APIService {
  static final APIService _instance = APIService._internal();
  late Dio _dio;
  late FlutterSecureStorage _secureStorage;

  static const String _baseUrl = 'http://localhost:3000/api';
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  factory APIService() {
    return _instance;
  }

  APIService._internal();

  static APIService get instance => _instance;

  Future<void> initialize() async {
    _secureStorage = const FlutterSecureStorage();
    
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      contentType: 'application/json',
    ));

    // Add interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Try to refresh token
            final refreshed = await _refreshAccessToken();
            if (refreshed) {
              return handler.resolve(await _retry(error.requestOptions));
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // Authentication
  Future<Map<String, dynamic>> signup({
    required String username,
    required String email,
    required String phone,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/signup', data: {
        'username': username,
        'email': email,
        'phone': phone,
        'password': password,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyOTP({
    required String userId,
    required String otp,
  }) async {
    try {
      final response = await _dio.post('/auth/verify-otp', data: {
        'user_id': userId,
        'otp': otp,
      });
      
      final data = response.data;
      if (data['token'] != null) {
        await setToken(data['token']);
        await setRefreshToken(data['refresh_token']);
      }
      
      return data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      final data = response.data;
      if (data['token'] != null) {
        await setToken(data['token']);
        await setRefreshToken(data['refresh_token']);
      }
      
      return data;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } finally {
      await clearTokens();
    }
  }

  // User Profile
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _dio.get('/users/profile');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    required String username,
    String? avatar,
  }) async {
    try {
      final response = await _dio.put('/users/profile', data: {
        'username': username,
        if (avatar != null) 'avatar': avatar,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> connectGamingId({
    required String freefireUid,
  }) async {
    try {
      final response = await _dio.post('/users/connect-gaming-id', data: {
        'freefire_uid': freefireUid,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Tournaments
  Future<Map<String, dynamic>> getTournaments({
    String? gameMode,
    String? status,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final response = await _dio.get('/tournaments', queryParameters: {
        if (gameMode != null) 'game_mode': gameMode,
        if (status != null) 'status': status,
        'page': page,
        'limit': limit,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getTournamentById(String id) async {
    try {
      final response = await _dio.get('/tournaments/$id');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> joinTournament({
    required String tournamentId,
  }) async {
    try {
      final response = await _dio.post('/tournaments/join', data: {
        'tournament_id': tournamentId,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Wallet
  Future<Map<String, dynamic>> getWalletBalance() async {
    try {
      final response = await _dio.get('/wallet/balance');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestDeposit({
    required double amount,
    required String paymentScreenshot,
  }) async {
    try {
      final response = await _dio.post('/wallet/deposit', data: {
        'amount': amount,
        'payment_screenshot': paymentScreenshot,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestWithdrawal({
    required double amount,
    required String upiId,
  }) async {
    try {
      final response = await _dio.post('/wallet/withdraw', data: {
        'amount': amount,
        'upi_id': upiId,
      });
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  // Token Management
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  Future<void> setToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> setRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  Future<bool> _refreshAccessToken() async {
    try {
      final refreshToken = await getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post('/auth/refresh-token', data: {
        'refresh_token': refreshToken,
      });

      if (response.data['token'] != null) {
        await setToken(response.data['token']);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final options = Options(
      method: requestOptions.method,
      headers: requestOptions.headers,
    );
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  bool get isAuthenticated {
    return _secureStorage.read(key: _tokenKey) != null;
  }

  void dispose() {
    _dio.close();
  }
}
