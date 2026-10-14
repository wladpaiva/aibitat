---
'aibitat': patch
---

Upgrade langchain to 0.3.37 and @langchain/core to 0.3.80 so the web-browsing
plugin is off the vulnerable 0.0.x release, and wire the Anthropic provider to
the Messages API the rest of the library already calls.
