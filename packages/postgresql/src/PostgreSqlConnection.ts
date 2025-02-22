import { readFile } from 'fs-extra';
import { KyselyPGlite } from 'kysely-pglite';
import { PGlite, types } from '@electric-sql/pglite';
import { AbstractSqlConnection, type ConnectionConfig, Utils } from '@mikro-orm/knex';

import { PGliteDriver } from './PGliteDriver.js';

type PgLiteConnectionConfig = ConnectionConfig & {
  dataDir?: string; // where the pglite cluster is stored
};

export class PostgreSqlConnection extends AbstractSqlConnection {

  protected database!: PGlite;

  override createKyselyDialect(overrides: any) {

    const options = this.mapOptions(overrides);
    this.database = new PGlite(options);
    const { dialect } = new KyselyPGlite(this.database);
    dialect.createDriver = () => new PGliteDriver(this.database, {
      onCreateConnection: this.options.onCreateConnection ?? this.config.get('onCreateConnection'),
    });

    return dialect;
  }

  mapOptions(overrides: any): any {
    const ret = { ...this.getConnectionOptions() };

    // use `select typname, oid, typarray from pg_type order by oid` to get the list of OIDs
    const parsers = {
      [types.DATE]: (str: string) => str,
      [types.TIMESTAMP]: (str: string) => str,
      [types.TIMESTAMPTZ]: (str: string) => str,
      [types.INTERVAL]: (str: string) => str,
      // Point type (borrowed from pg-types under the MIT license)
      600: (str: string) => {
        if (str[0] !== '(') { return null; }

        const parsedString = str.substring(1, str.length - 1).split(',');

        return {
          x: parseFloat(parsedString[0]),
          y: parseFloat(parsedString[1]),
        };
      },
    };

    (ret as any).parsers = parsers;

    return Utils.mergeConfig(ret, overrides);
  }

  // @todo maybe not required?
  override transformRawResult<T>(res: any, method?: 'all' | 'get' | 'run'): T {
    if (method === 'get') {
      return res.rows[0];
    }

    if (method === 'all') {
      return res.rows;
    }

    return {
      affectedRows: res.affectedRows > 0 ? res.affectedRows : res.rows.length,
      ...(res.insertId ? { insertId: res.insertId } : {}),
      row: res.rows[0],
      rows: res.rows,
    } as unknown as T;
  }

  override async loadFile(path: string): Promise<void> {
    await this.ensureConnection();
    const sql = await readFile(path);
    await this.database.exec(sql.toString());
  }

  override getConnectionOptions(): PgLiteConnectionConfig {
    const ret: PgLiteConnectionConfig = super.getConnectionOptions();

    if (this.options.clientUrl) {
      const url = new URL(this.options.clientUrl);
      if (this.options.host || url.searchParams.has('dataDir')) {
        this.options.host = ret.dataDir = this.options.host ?? decodeURIComponent(url.searchParams.get('dataDir')!);
        this.config.set('host', (ret as any).dataDir);
      }
    } else {
      const url = new URL(this.config.getClientUrl());

      this.options.host = ret.dataDir = this.options.host ?? decodeURIComponent(url.searchParams.get('dataDir')!);
      this.options.user = ret.user = this.options.user ?? this.config.get('user', decodeURIComponent(url.username));
      this.options.dbName = ret.database = this.options.dbName ?? this.config.get('dbName', decodeURIComponent(url.pathname).replace(/^\//, ''));

    }

    return ret;
  }

  override getClientUrl(): string {
    const options = this.getConnectionOptions();

    const params = new URLSearchParams(
      {
        ...(options.host ? { dataDir: options.host } : {}),
        ...(options.schema && options.schema !== this.platform.getDefaultSchemaName() ? { schema: options.schema } : {}),
      },
    );
    const extra = [...params.keys()].length > 0 ? `?${params.toString()}` : '';

    return `${new URL(this.config.getClientUrl(true)).toString()}${extra}`;
  }

}
