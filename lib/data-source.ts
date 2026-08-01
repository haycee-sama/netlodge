// lib/data-source.ts
   export const USE_DB = process.env.USE_DATABASE === 'true'
   import * as mockData from './data'
   import * as dbQueries from './db/queries'
   export const dataSource = USE_DB ? dbQueries : mockData