/**
 * Cache Plugin for AIbitat
 *
 * Provides simple in-memory caching with optional TTL support.
 * This plugin helps reduce redundant computations and API calls.
 */

import type {AIbitat} from '..'

/**
 * Cache entry structure
 */
interface CacheEntry {
  value: any
  expiresAt?: number // Unix timestamp in milliseconds
}

/**
 * In-memory cache storage
 */
class CacheStore {
  private cache: Map<string, CacheEntry>
  private ttlEnabled: boolean
  private defaultTTL: number // in milliseconds

  constructor(options: {ttlEnabled?: boolean; defaultTTL?: number} = {}) {
    this.cache = new Map()
    this.ttlEnabled = options.ttlEnabled ?? false
    this.defaultTTL = options.defaultTTL ?? 3600000 // 1 hour default
  }

  /**
   * Get a value from cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check TTL if enabled
    if (this.ttlEnabled && entry.expiresAt) {
      const now = Date.now()
      if (now > entry.expiresAt) {
        // Entry expired
        this.cache.delete(key)
        return null
      }
    }

    return entry.value
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: any, ttl?: number): void {
    const entry: CacheEntry = {value}

    // Set expiration if TTL is enabled and provided
    if (this.ttlEnabled && (ttl || this.defaultTTL)) {
      const ttlMs = ttl ?? this.defaultTTL
      entry.expiresAt = Date.now() + ttlMs
    }

    this.cache.set(key, entry)
  }

  /**
   * Clear a specific key or all cache
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  stats(): {size: number; keys: string[]} {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    if (!this.ttlEnabled) {
      return 0
    }

    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }
}

/**
 * Global cache store instance
 */
let cacheStore: CacheStore

/**
 * Get a value from cache
 *
 * @param key - The cache key
 * @returns The cached value or null if not found/expired
 */
export async function cacheGet(key: string): Promise<any | null> {
  console.log(`📦 Getting from cache: ${key}`)
  const value = cacheStore.get(key)
  if (value !== null) {
    console.log(`✅ Cache hit: ${key}`)
  } else {
    console.log(`❌ Cache miss: ${key}`)
  }
  return value
}

/**
 * Set a value in cache
 *
 * @param key - The cache key
 * @param value - The value to cache
 * @param ttl - Optional time-to-live in milliseconds
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl?: number,
): Promise<void> {
  console.log(`📦 Setting cache: ${key}`)
  cacheStore.set(key, value, ttl)
  console.log(`✅ Cache set: ${key}`)
}

/**
 * Clear cache entries
 *
 * @param key - Optional specific key to clear, if not provided clears all cache
 */
export async function cacheClear(key?: string): Promise<void> {
  if (key) {
    console.log(`📦 Clearing cache key: ${key}`)
    cacheStore.clear(key)
    console.log(`✅ Cache cleared: ${key}`)
  } else {
    console.log('📦 Clearing all cache')
    cacheStore.clear()
    console.log('✅ All cache cleared')
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics including size and keys
 */
export async function cacheStats(): Promise<{size: number; keys: string[]}> {
  const stats = cacheStore.stats()
  console.log(`📊 Cache stats: ${stats.size} entries`)
  return stats
}

/**
 * Clean up expired cache entries
 *
 * @returns Number of entries removed
 */
export async function cacheCleanup(): Promise<number> {
  console.log('🧹 Cleaning up expired cache entries')
  const removed = cacheStore.cleanup()
  console.log(`✅ Cleaned up ${removed} expired entries`)
  return removed
}

/**
 * Cache Plugin Setup
 *
 * Options:
 * - ttlEnabled: Enable TTL (Time-To-Live) for cache entries (default: false)
 * - defaultTTL: Default TTL in milliseconds (default: 3600000 = 1 hour)
 */
export function cachePlugin(
  options: {
    ttlEnabled?: boolean
    defaultTTL?: number
  } = {},
) {
  return {
    name: 'cache-plugin',
    setup(aibitat: AIbitat<any>) {
      // Initialize cache store
      cacheStore = new CacheStore({
        ttlEnabled: options.ttlEnabled ?? false,
        defaultTTL: options.defaultTTL ?? 3600000,
      })

      console.log('📦 Cache plugin initialized')

      // Register cacheGet function
      aibitat.function({
        name: 'cache_get',
        description:
          'Get a value from cache by key. Returns null if not found or expired.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The cache key to retrieve',
            },
          },
          required: ['key'],
          additionalProperties: false,
        },
        async handler({key}) {
          return await cacheGet(key)
        },
      })

      // Register cacheSet function
      aibitat.function({
        name: 'cache_set',
        description:
          'Set a value in cache with optional TTL (time-to-live). Use this to cache results of expensive computations or API calls.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The cache key to store',
            },
            value: {
              type: 'string',
              description:
                'The value to cache (JSON stringified if needed). Should be a string value.',
            },
            ttl: {
              type: 'number',
              description:
                'Optional time-to-live in milliseconds. If not provided, uses default TTL (1 hour if TTL is enabled). Set to 0 for no expiration.',
            },
          },
          required: ['key', 'value'],
          additionalProperties: false,
        },
        async handler({key, value, ttl}) {
          await cacheSet(key, value, ttl)
          return `Successfully cached value for key: ${key}`
        },
      })

      // Register cacheClear function
      aibitat.function({
        name: 'cache_clear',
        description:
          'Clear cache entries. If a key is provided, clears only that key. If not provided, clears all cache entries.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description:
                'Optional specific cache key to clear. If not provided, clears all cache.',
            },
          },
          required: [],
          additionalProperties: false,
        },
        async handler({key}) {
          await cacheClear(key)
          return key
            ? `Successfully cleared cache key: ${key}`
            : 'Successfully cleared all cache'
        },
      })

      // Register cacheStats function
      aibitat.function({
        name: 'cache_stats',
        description:
          'Get cache statistics including size and list of all keys. Useful for monitoring cache usage.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        },
        async handler() {
          const stats = await cacheStats()
          return JSON.stringify(stats, null, 2)
        },
      })

      // Register cacheCleanup function
      aibitat.function({
        name: 'cache_cleanup',
        description:
          'Clean up expired cache entries. Only removes entries that have passed their TTL. Useful when TTL is enabled.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        },
        async handler() {
          const removed = await cacheCleanup()
          return `Successfully cleaned up ${removed} expired cache entries`
        },
      })
    },
  } as AIbitat.Plugin<any>
}
