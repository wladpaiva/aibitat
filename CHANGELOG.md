# AIbitat

## 0.0.1-beta.4

### Patch Changes

- f1c2aff: added plugin support
- 98869b7: fix a where it was selecting the wrong the next participant in the
  group
- 937ac28: `.on` method is being replaced by especialized `.onXXX` methods
- 41aea69: added `onStart` event

## 0.0.1-beta.3

### Patch Changes

- cabb37f: Rename `ChatFlow` to `AIbitat` because npm complained about it being
  too similar to the package `chat-flow` and forced me using my username as
  scope... since I don't want go down that road I prefered changing the package
  name to something more unique

## 0.0.1-beta.2

### Patch Changes

- fix module exports

## 0.0.1-beta.1

### Patch Changes

- add dist files in the exported module

## 0.0.1-beta.0

### Patch Changes

- - **Automated reply with loop prevention.** Chats are kept alive until the
    assistant interrupts the conversation.
  - **Group chats.** Agents chat with multiple other agents at the same time as
    if they were in a Whatsapp group. The next agent to reply is chosen based on
    the conversation and predicted most likely to reply.
