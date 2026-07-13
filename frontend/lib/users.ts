import { prisma } from "./prisma";
import { hashPassword } from "./auth";

// email lookups are case-insensitive, we always store and query the lowercased form
export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// register a password user; first-party signups become ADMIN in this single-tenant app
export async function createUser(username: string, email: string, password: string) {
  const existing = await findByEmail(email);
  if (existing) throw new Error("Email already registered");
  return prisma.user.create({
    data: {
      username,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });
}

// find-or-create for OAuth sign-in; no passwordHash and only USER role since identity is federated
export async function upsertOAuthUser(email: string, username: string) {
  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: lower, username, role: "USER" },
  });
}

// used by the reset-password flow once the token's been checked
export async function updatePasswordByEmail(email: string, password: string) {
  return prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: await hashPassword(password) },
  });
}

// admin listing, explicit select so passwordHash never leaves the db layer
export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export async function updateUserRole(id: string, role: string) {
  return prisma.user.update({ where: { id }, data: { role } });
}
