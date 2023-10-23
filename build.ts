console.time('Build completed')
await Bun.build({
  entrypoints: ['./src/index.ts', './src/plugins/index.ts'],
  outdir: './dist',
  splitting: true,
  plugins: [
    {
      name: 'make-all-packages-external',
      setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
        build.onResolve({filter}, args => ({path: args.path, external: true}))
      },
    },
  ],
})

console.timeEnd('Build completed')
