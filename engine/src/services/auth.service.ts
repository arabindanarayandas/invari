import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '../repositories/user.repository.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string) {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await (bcrypt.hash as any)(password, SALT_ROUNDS);

    // Create user
    const user = await userRepository.create(
      email,
      passwordHash,
    );

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user has a password (not a Google OAuth user)
    if (!user.passwordHash) {
      throw new Error('This account uses Google login. Please sign in with Google.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Login or register user with Google OAuth
   */
  async googleLogin(credential: string) {
    // Verify Google ID token
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      throw new Error('Invalid Google credential');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google token payload');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    // Check if user exists by Google ID
    let user = await userRepository.findByGoogleId(googleId);

    if (user) {
      // User exists, log them in
      const token = this.generateToken(user.id);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      };
    }

    // Check if user exists by email (email/password account)
    user = await userRepository.findByEmail(email);

    if (user) {
      // User has email/password account but trying to login with Google
      // This is not allowed for security reasons
      throw new Error('An account with this email already exists. Please login with email and password.');
    }

    // Create new Google user
    user = await userRepository.create(
      email,
      null, // no password for Google users
      name,
      googleId,
      'google'
    );

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Verify JWT token and return user ID
   */
  verifyToken(token: string): string {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  /**
   * Get user by ID (for authenticated requests)
   */
  async getUserById(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
