# Instagram Following Hybrid

Original Apify actor for extracting Instagram following lists in three product tiers:

- Free: public profiles, no cookies
- Plus: cookies allowed for better reliability
- VIP: larger limits and richer diagnostics

## Input

Use `usernames` or `directUrls` as the primary target list.

### Example

```json
{
  "usernames": ["zuck", "therock"],
  "mode": "free",
  "maxCount": 25,
  "includeProfile": true,
  "includeDiagnostics": true
}
```

## Output

Each result contains:

- `username`
- `profileUrl`
- `mode`
- `success`
- `follows`
- `followsCount`
- `warnings`
- `errors`
- `timing`

## Notes

- The actor is intentionally original.
- Cookies are optional but improve success rate in Plus/VIP mode.
- If Instagram does not expose the following list in the fetched page, the actor returns a structured diagnostic instead of failing the whole run.
