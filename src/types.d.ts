declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (buffer?: ArrayBuffer) => Database
  }

  interface Database {
    prepare: (sql: string) => Statement
    exec: (sql: string) => any[]
    export: () => Uint8Array
    close: () => void
  }

  interface Statement {
    bind: (params?: Record<string, any> | any[]) => void
    step: () => boolean
    getAsObject: () => Record<string, any>
    get: () => any[]
    reset: () => void
    free: () => void
  }

  interface InitSqlJsStatic {
    (config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>
  }

  const initSqlJs: InitSqlJsStatic
  export default initSqlJs
}