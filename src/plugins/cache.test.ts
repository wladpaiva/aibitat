import {beforeEach, describe, expect, it} from 'bun:test'

import {cachePlugin} from './cache'

describe('Cache Plugin', () => {
  // Create a mock AIbitat instance
  let mockAIbitat: any
  let registeredFunctions: Map<string, any>

  beforeEach(() => {
    registeredFunctions = new Map()
    mockAIbitat = {
      function: (config: any) => {
        registeredFunctions.set(config.name, config.handler)
      },
    }
  })

  describe('Plugin Setup', () => {
    it('should initialize without errors', () => {
      const plugin = cachePlugin()
      expect(plugin.name).toBe('cache-plugin')
    })

    it('should register all functions', () => {
      const plugin = cachePlugin()
      plugin.setup(mockAIbitat)

      expect(registeredFunctions.has('cache_get')).toBe(true)
      expect(registeredFunctions.has('cache_set')).toBe(true)
      expect(registeredFunctions.has('cache_clear')).toBe(true)
      expect(registeredFunctions.has('cache_stats')).toBe(true)
      expect(registeredFunctions.has('cache_cleanup')).toBe(true)
    })
  })

  describe('Basic Cache Operations', () => {
    beforeEach(() => {
      const plugin = cachePlugin({ttlEnabled: false})
      plugin.setup(mockAIbitat)
    })

    it('should set and get a value', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      await setHandler({key: 'test-key', value: 'test-value'})
      const result = await getHandler({key: 'test-key'})

      expect(result).toBe('test-value')
    })

    it('should return null for non-existent key', async () => {
      const getHandler = registeredFunctions.get('cache_get')
      const result = await getHandler({key: 'non-existent'})

      expect(result).toBeNull()
    })

    it('should clear a specific key', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')
      const clearHandler = registeredFunctions.get('cache_clear')

      await setHandler({key: 'test-key', value: 'test-value'})
      await clearHandler({key: 'test-key'})
      const result = await getHandler({key: 'test-key'})

      expect(result).toBeNull()
    })

    it('should clear all cache', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')
      const clearHandler = registeredFunctions.get('cache_clear')
      const statsHandler = registeredFunctions.get('cache_stats')

      await setHandler({key: 'key1', value: 'value1'})
      await setHandler({key: 'key2', value: 'value2'})

      await clearHandler({})

      const stats = JSON.parse(await statsHandler({}))
      expect(stats.size).toBe(0)
    })

    it('should return cache statistics', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const statsHandler = registeredFunctions.get('cache_stats')

      await setHandler({key: 'key1', value: 'value1'})
      await setHandler({key: 'key2', value: 'value2'})

      const stats = JSON.parse(await statsHandler({}))
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })

  describe('TTL (Time-To-Live) Functionality', () => {
    beforeEach(() => {
      const plugin = cachePlugin({ttlEnabled: true, defaultTTL: 1000})
      plugin.setup(mockAIbitat)
    })

    it('should respect TTL and expire entries', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      await setHandler({key: 'test-key', value: 'test-value', ttl: 100})

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await getHandler({key: 'test-key'})
      expect(result).toBeNull()
    })

    it('should not expire entry before TTL', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      await setHandler({key: 'test-key', value: 'test-value', ttl: 500})

      // Check before TTL expires
      await new Promise(resolve => setTimeout(resolve, 50))

      const result = await getHandler({key: 'test-key'})
      expect(result).toBe('test-value')
    })

    it('should cleanup expired entries', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const statsHandler = registeredFunctions.get('cache_stats')
      const cleanupHandler = registeredFunctions.get('cache_cleanup')

      await setHandler({key: 'key1', value: 'value1', ttl: 50})
      await setHandler({key: 'key2', value: 'value2', ttl: 100})
      await setHandler({key: 'key3', value: 'value3', ttl: 1000})

      // Wait for first two to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      const removed = await cleanupHandler({})
      expect(removed).toBe('Successfully cleaned up 2 expired cache entries')

      const stats = JSON.parse(await statsHandler({}))
      expect(stats.size).toBe(1)
      expect(stats.keys).toContain('key3')
    })
  })

  describe('Default TTL', () => {
    it('should use default TTL when no TTL is provided', async () => {
      const plugin = cachePlugin({ttlEnabled: true, defaultTTL: 100})
      plugin.setup(mockAIbitat)

      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      await setHandler({key: 'test-key', value: 'test-value'})

      // Wait for default TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await getHandler({key: 'test-key'})
      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      const plugin = cachePlugin()
      plugin.setup(mockAIbitat)
    })

    it('should handle empty keys', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      await setHandler({key: '', value: 'value'})
      const result = await getHandler({key: ''})

      expect(result).toBe('value')
    })

    it('should handle special characters in keys', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      const specialKey = 'key-with-special.chars_123'
      await setHandler({key: specialKey, value: 'value'})
      const result = await getHandler({key: specialKey})

      expect(result).toBe('value')
    })

    it('should handle JSON stringified values', async () => {
      const setHandler = registeredFunctions.get('cache_set')
      const getHandler = registeredFunctions.get('cache_get')

      const complexValue = JSON.stringify({nested: {data: 'value'}})
      await setHandler({key: 'complex', value: complexValue})
      const result = await getHandler({key: 'complex'})

      expect(result).toBe(complexValue)
    })
  })
})
