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

  async create(email: string, passwordHash: string) {
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
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
