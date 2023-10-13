# meu-autogen

This project is a fork from the original
[autogen](https://github.com/microsoft/autogen) project but done in TypeScript.

I took a sightly different approach to the original project, agents are now
provider agnostic and can be used with any provider that implements the
`AIProvider` interface.

## Features

- [x] Automated reply with loop prevention
- [x] Group chats
- [ ] Function execution
- [ ] Code execution

## Contributing

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run examples/basic.ts
```

This project was created using `bun init` in bun v1.0.3. [Bun](https://bun.sh)
is a fast all-in-one JavaScript runtime.
