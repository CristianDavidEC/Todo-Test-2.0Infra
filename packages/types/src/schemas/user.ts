import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  auth0UserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).nullable(),
  picture: z.string().url().nullable(),
  locale: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const PublicUserSchema = UserSchema.omit({ auth0UserId: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;

// Input de creación: subconjunto editable de User (sin id/timestamps).
export const CreateUserSchema = UserSchema.pick({
  auth0UserId: true,
  email: true,
  name: true,
  picture: true,
  locale: true,
});
export type CreateUser = z.infer<typeof CreateUserSchema>;
