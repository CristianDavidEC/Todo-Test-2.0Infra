import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository, type UserRow } from "@todo-list-poc-infra/db";
import type { CreateUserDto, PublicUserDto } from "./users.dto";

/**
 * Lógica del recurso `users`. Orquesta el `UsersRepository` y mapea filas
 * de BD → DTO público (omite `auth0UserId`, serializa fechas a ISO).
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async list(): Promise<PublicUserDto[]> {
    const rows = await this.usersRepo.list();
    return rows.map(toPublic);
  }

  async getById(id: string): Promise<PublicUserDto> {
    const row = await this.usersRepo.findById(id);
    if (!row) throw new NotFoundException(`User ${id} not found`);
    return toPublic(row);
  }

  async create(input: CreateUserDto): Promise<PublicUserDto> {
    const row = await this.usersRepo.create(input);
    return toPublic(row);
  }
}

function toPublic(row: UserRow): PublicUserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}
