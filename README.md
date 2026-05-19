# Instagram Following Hybrid

Original Apify actor for extracting Instagram following lists with a simple commercial split:

- Free: public profiles, no cookies
- Plus: cookies allowed for higher reliability
- VIP: larger limits and richer diagnostics

## What this actor does now

- Normalizes `usernames` and `directUrls`.
- Fetches Instagram profile/following pages with a conservative HTML parser.
- Returns a structured result per target.
- Preserves partial success when one target fails.
- Uses cookies and retries in Plus/VIP mode.
- Returns lean output when `includeDiagnostics` is disabled.
- Writes a run summary when executed inside Apify.

## What this actor does not claim yet

- It does not guarantee full following extraction for every profile.
- It does not bypass private profiles or login walls.
- It does not copy third-party actor code.

## Input

Use `usernames` or `directUrls` as the primary target list.

Supported fields:

- `usernames`
- `directUrls`
- `cookies`
- `mode`
- `maxCount`
- `includeProfile`
- `includeDiagnostics`
- `complianceAck`

### Example

```json
{
  "usernames": ["zuck", "therock"],
  "mode": "free",
  "maxCount": 25,
  "includeProfile": true,
  "includeDiagnostics": true,
  "complianceAck": true
}
```

## Output

Each result contains:

- `username`
- `profileUrl`
- `mode`
- `success`
- `profile`
- `state`
- `follows`
- `followsCount`
- `warnings`
- `errors`
- `timing`

## Validation

Local checks:

```powershell
node --test .\actors\instagram-following-hybrid\test\*.test.js
node .\actors\instagram-following-hybrid\src\main.js
```

Expected:

- tests pass
- local execution prints an empty array when no input is supplied

## Security and Compliance

- Security policy: [`SECURITY.md`](./SECURITY.md)
- Compliance notes: [`COMPLIANCE.md`](./COMPLIANCE.md)

## Notes

- The actor is intentionally original.
- Cookies are optional but improve success rate in Plus/VIP mode.
- Plus/VIP also increase retry tolerance for transient HTTP failures.
- If Instagram does not expose the following list in the fetched page, the actor returns a structured diagnostic instead of failing the whole run.
- The actor will not run unless `complianceAck` is explicitly set to `true`.
