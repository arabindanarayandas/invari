import { eq } from 'drizzle-orm';
import { db, users } from '../db/index.js';

export class UserRepository {
  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  async findByGoogleId(googleId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);

    return user;
  }

  async create(
    email: string,
    passwordHash?: string | null,
    name?: string | null,
    googleId?: string | null,
    authProvider: 'email' | 'google' = 'email'
  ) {
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash: passwordHash || null,
        name: name || null,
        googleId: googleId || null,
        authProvider,
      })
      .returning();

    return user;
  }

  async exists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !!user;
  }
}

export const userRepository = new UserRepository();
