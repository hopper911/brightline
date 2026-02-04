# Development Commands

Run these commands **one at a time** from the `brightline` directory. Do not paste multiple commands with `#` comments on the same line—some shells can pass `#` to Next.js and cause errors.

```bash
cd brightline
npm run dev
```

Then in a new terminal for build:

```bash
cd brightline
npm run build
```

## If git push fails

If you see `pack-objects died of signal 10` or `remote end hung up unexpectedly`:

1. Increase git buffer:
   ```bash
   git config http.postBuffer 524288000
   ```

2. Retry:
   ```bash
   git push
   ```

3. If it still fails, push in smaller chunks:
   ```bash
   git push origin feature/dark-editorial --no-verify
   ```
