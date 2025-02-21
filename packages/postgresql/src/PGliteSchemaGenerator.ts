import { type SqlEntityManager, SqlSchemaGenerator } from '@mikro-orm/knex';
import { type MikroORM, type Transaction } from '@mikro-orm/core';

export class PGliteSchemaGenerator extends SqlSchemaGenerator {

  static override register(orm: MikroORM): void {
    orm.config.registerExtension('@mikro-orm/schema-generator', () => new PGliteSchemaGenerator(orm.em as SqlEntityManager));
  }

   override async execute(sql: string, options: { wrap?: boolean; ctx?: Transaction } = {}) {
    options.wrap ??= false;
    const lines = this.wrapSchema(sql, options).split('\n');
    const groups: string[][] = [];
    let i = 0;

    for (const line of lines) {
      if (line.trim() === '') {
        if (groups[i]?.length > 0) {
          i++;
        }

        continue;
      }

      groups[i] ??= [];
      groups[i].push(line.trim());
    }

    if (groups.length === 0) {
      return;
    }

    for (const group of groups) {
      const query = group.join('\n');
      // @todo: add to type if we keep the loadQuery concept
      await (this.driver as any).loadQuery(query);
    }

    return;
  }

}
