import  { CompiledQuery, type TransactionSettings, createQueryId, type DatabaseConnection, type QueryCompiler } from 'kysely';
import { type PGlite } from '@electric-sql/pglite';
import { PGliteDriver as PGliteDriverBase } from 'kysely-pglite';
import { parseSavepointCommand } from 'node_modules/kysely/dist/esm/parser/savepoint-parser';

export interface PgLiteDriverConfig {
 onCreateConnection?: (connection: DatabaseConnection) => Promise<void>;
}

export class PGliteDriver extends PGliteDriverBase {

  #config: PgLiteDriverConfig = {};

  constructor(client: PGlite, config: PgLiteDriverConfig) {
    super(client);
    this.#config = config;
  }

  override async acquireConnection(): Promise<DatabaseConnection> {
    const connection = await super.acquireConnection();
    if (this.#config.onCreateConnection) {
      await this.#config.onCreateConnection(connection);
    }
    return connection;
  }

  override async beginTransaction(connection: DatabaseConnection, settings: TransactionSettings): Promise<void> {
    if (settings.isolationLevel || settings.accessMode) {
      let sql = 'start transaction';

      if (settings.isolationLevel) {
        sql += ` isolation level ${settings.isolationLevel}`;
      }

      if (settings.accessMode) {
        sql += ` ${settings.accessMode}`;
      }

      await connection.executeQuery(CompiledQuery.raw(sql));
    } else {
      await connection.executeQuery(CompiledQuery.raw('begin'));
    }
  }

    async savepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler['compileQuery'],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand('savepoint', savepointName),
        createQueryId(),
      ),
    );
  }

  async rollbackToSavepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler['compileQuery'],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand('rollback to', savepointName),
        createQueryId(),
      ),
    );
  }

  async releaseSavepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler['compileQuery'],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand('release', savepointName),
        createQueryId(),
      ),
    );
  }

}
