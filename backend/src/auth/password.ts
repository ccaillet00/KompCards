import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(input: {
  hash: string;
  password: string;
}): Promise<boolean> {
  return bcrypt.compare(input.password, input.hash);
}
