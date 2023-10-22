---
'aibitat': patch
---

Added `experimental_webBrowsing` plugin to allow you to browse the web from your
AIbitat instance.

```ts
import { AIbitat } from 'aibitat';
import { experimental_webBrowsing } from 'aibitat/plugins';

const aibitat = new AIbitat(...)
    .use(experimental_webBrowsing());
```

NOTE: This plugin is still in development and is not yet ready for use in
production.
