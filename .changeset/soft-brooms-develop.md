---
'aibitat': patch
---

Added `aibitat/plugins` as a plugin directory. This allows you enable plugins to
your AIbitat instance.

```ts
import { AIbitat } from 'aibitat';
import { cli } from 'aibitat/plugins';

const aibitat = new AIbitat(...)
    .use(cli());
```
