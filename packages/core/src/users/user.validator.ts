import { UserSchema, type User } from "@todo-list-poc-infra/types";

export function validateUser(input: unknown): User {
  return UserSchema.parse(input);
}

export function validateEmail(email: string): boolean {
  return UserSchema.shape.email.safeParse(email).success;
}
