import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final goRouterProvider = Provider((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const SizedBox(), // Home screen
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const SizedBox(), // Login screen
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SizedBox(), // Signup screen
      ),
      GoRoute(
        path: '/tournaments',
        name: 'tournaments',
        builder: (context, state) => const SizedBox(), // Tournaments list
      ),
      GoRoute(
        path: '/wallet',
        name: 'wallet',
        builder: (context, state) => const SizedBox(), // Wallet screen
      ),
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const SizedBox(), // User profile
      ),
    ],
  );
});
