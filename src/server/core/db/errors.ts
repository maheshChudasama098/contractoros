// Match Sequelize errors by name: the bundler can load sequelize twice, which breaks `instanceof`.
const named = (name: string) => (err: unknown): boolean => err instanceof Error && err.name === name;

export const isForeignKeyError = named("SequelizeForeignKeyConstraintError");
export const isUniqueError = named("SequelizeUniqueConstraintError");
