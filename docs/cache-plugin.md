# Cache Plugin

Simple in-memory caching with optional TTL support to reduce redundant
computations and API calls.

## Features

- **Basic cache operations**: `get`, `set`, `clear`
- **Optional TTL (Time-To-Live)**: Configure expiration times for cache entries
- **Cache statistics**: Monitor cache size and keys
- **Automatic cleanup**: Remove expired entries
- **Zero dependencies**: Lightweight implementation

## Installation

The cache plugin is built into aibitat. Enable it in your agent configuration:

```typescript
import {AIbitat} from 'aibitat'

const aibitat = new AIbitat({
  model: 'gpt-4',
})

aibitat.use(cachePlugin())
```

## Usage

### Basic Usage

```typescript
import {AIbitat} from 'aibitat'

const aibitat = new AIbitat({
  model: 'gpt-4',
})

// Enable cache plugin
aibitat.use(cachePlugin())

await aibitat.chat(\`
  First, compute the result of 2^20 and cache it with key "exp_20".
  Then, retrieve it using cache_get.
\`)
```

### With TTL Enabled

```typescript
import {AIbitat} from 'aibitat'
import {cachePlugin} from 'aibitat/plugins/cache'

const aibitat = new AIbitat({
  model: 'gpt-4',
})

// Enable cache with 1-hour default TTL
aibitat.use(cachePlugin({
  ttlEnabled: true,
  defaultTTL: 3600000, // 1 hour in milliseconds
}))

await aibitat.chat(\`
  Cache the API response for 10 minutes (600000ms).
\`)
```

### Available Functions

The plugin registers the following functions:

#### \`cache_get\`

Get a value from cache by key. Returns \`null\` if not found or expired.

\`\`\`typescript await aibitat.function('cache_get', { key: 'my-cache-key', })
\`\`\`

#### \`cache_set\`

Set a value in cache with optional TTL.

\`\`\`typescript await aibitat.function('cache_set', { key: 'my-cache-key',
value: 'my-value', ttl: 600000, // Optional: 10 minutes in milliseconds })
\`\`\`

#### \`cache_clear\`

Clear cache entries. If a key is provided, clears only that key. If not
provided, clears all cache.

\`\`\`typescript // Clear specific key await aibitat.function('cache_clear', {
key: 'my-cache-key', })

// Clear all cache await aibitat.function('cache_clear', {}) \`\`\`

#### \`cache_stats\`

Get cache statistics including size and list of all keys.

\`\`\`typescript const stats = await aibitat.function('cache_stats', {}) //
Returns: { size: 5, keys: ['key1', 'key2', ...] } \`\`\`

#### \`cache_cleanup\`

Clean up expired cache entries. Only removes entries that have passed their TTL.

\`\`\`typescript const removed = await aibitat.function('cache_cleanup', {}) //
Returns: "Successfully cleaned up 2 expired cache entries" \`\`\`

## Use Cases

### 1. Cache Expensive Computations

\`\`\`typescript await aibitat.chat(\` I need to compute prime numbers up
to 10000. First check if result is in cache with key "primes_10000". If not,
compute and cache it for 1 hour. \`) \`\`\`

### 2. Reduce API Calls

\`\`\`typescript await aibitat.chat(\` Get weather data for Beijing. Cache the
result for 30 minutes (1800000ms). On subsequent requests, use the cached value.
\`) \`\`\`

### 3. Cache Intermediate Results

\`\`\`typescript await aibitat.chat(\` Analyze this large document in chunks.
Cache each chunk's analysis to avoid recomputation. \`) \`\`\`

## Configuration Options

\`\`\`typescript interface CachePluginOptions { /\*\*

- Enable TTL (Time-To-Live) for cache entries.
- @default false \*/ ttlEnabled?: boolean

/\*\*

- Default TTL in milliseconds.
- @default 3600000 (1 hour) \*/ defaultTTL?: number } \`\`\`

## Best Practices

1. **Use descriptive keys**: Keys should clearly identify the cached content
   \`\`\`typescript // Good 'weather_beijing_2026-02-28'
   'api_user_profile_12345'

   // Avoid 'key1' 'temp' \`\`\`

2. **Set appropriate TTL**: Balance between freshness and performance

   - Short-lived data: 5-15 minutes
   - Mid-term data: 1-6 hours
   - Long-term data: 1-24 hours

3. **Regular cleanup**: Periodically call \`cache_cleanup\` to remove expired
   entries

4. **Monitor cache stats**: Use \`cache_stats\` to understand cache usage
   patterns

## Example: Smart Weather Bot

\`\`\`typescript import {AIbitat} from 'aibitat' import {cachePlugin} from
'aibitat/plugins/cache'

const aibitat = new AIbitat({ model: 'gpt-4', })

aibitat.use(cachePlugin({ ttlEnabled: true, defaultTTL: 1800000, // 30 minutes
}))

await aibitat.chat(\` I want a weather bot that caches responses. When user asks
for weather in a city:

1. Check cache with key "weather\_[city]"
2. If not in cache, fetch and cache it
3. Return the result \`) \`\`\`

## Limitations

- **In-memory only**: Cache is not persisted across restarts
- **No distributed cache**: Not suitable for multi-instance deployments
- **String values only**: Complex objects should be JSON stringified

## Future Enhancements

- [ ] Persistent cache (Redis, SQLite)
- [ ] LRU (Least Recently Used) eviction policy
- [ ] Cache size limits
- [ ] Distributed cache support

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT License - see LICENSE file for details.
