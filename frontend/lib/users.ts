import { prisma } from "./prisma";
import { hashPassword } from "./auth";

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

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
