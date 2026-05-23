import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './index'

let initialized = false

/** Apply pending migrations and ensure the thumbnail cache directory exists. */
export function ensureDbReady(): void {
  if (initialized) return
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  mkdirSync(resolve(process.cwd(), '.hoshi-thumbs'), { recursive: true })
  initialized = true
}
