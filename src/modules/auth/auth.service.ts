import type { FastifyInstance } from "fastify";
import { getUserCollection } from "../user/user.model";
import { ConflictError, UnauthorizedError } from "../../utils/errors";
import { hashPassword, verifyPassword } from "../../utils/crypto";

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(email: string, password: string): Promise<string> {
    const db = this.app.mongo.db;
    const users = getUserCollection(db);

    const existing = await users.findOne({ email });
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = hashPassword(password);
    const result = await users.insertOne({
      email,
      passwordHash,
      role: "user",
      createdAt: new Date(),
    });

    const token = this.app.jwt.sign({
      sub: result.insertedId.toHexString(),
      role: "user",
    });

    return token;
  }

  async login(email: string, password: string): Promise<string> {
    const db = this.app.mongo.db;
    const users = getUserCollection(db);

    const user = await users.findOne({ email });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    return this.app.jwt.sign({
      sub: user._id.toHexString(),
      role: user.role,
    });
  }
}
