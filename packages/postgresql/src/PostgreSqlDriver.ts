import type { Configuration } from '@mikro-orm/core';
import { AbstractSqlDriver } from '@mikro-orm/knex';
import { PostgreSqlConnection } from './PostgreSqlConnection.js';
import { PostgreSqlPlatform } from './PostgreSqlPlatform.js';

export class PostgreSqlDriver extends AbstractSqlDriver<PostgreSqlConnection> {

  constructor(config: Configuration) {
    super(config, new PostgreSqlPlatform(), PostgreSqlConnection, ['kysely', 'pglite']);
  }

  /*
   @todo adopt at least the logger, but maybe other query types

    async execute<T extends QueryResult | EntityData<AnyEntity> | EntityData<AnyEntity>[] = EntityData<AnyEntity>[]>(query: string | NativeQueryBuilder | RawQueryFragment, params: any[] = [], method: 'all' | 'get' | 'run' = 'all', ctx?: Transaction, loggerContext?: LoggingOptions): Promise<T> {
      return this.rethrow(this.connection.execute(query, params, method, ctx, loggerContext));
    }
  */
  async loadQuery(query: string): Promise<void> {
    return this.rethrow(this.connection.loadQuery(query));
    // return this.rethrow(this.connection.execute(query, params, method, ctx, loggerContext));
  }

}
