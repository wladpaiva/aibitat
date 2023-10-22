---
'aibitat': patch
---

Added plugins support to the AIbitat instance. This allows you to extend the
AIbitat instance with additional functionality.

```ts
import { AIbitat } from 'aibitat';

const aibitat = new AIbitat(...)
    .use({
        name: 'my-plugin',
        setup: (aibitat) => {
            // do something with the AIbitat instance
        },
    });
```
