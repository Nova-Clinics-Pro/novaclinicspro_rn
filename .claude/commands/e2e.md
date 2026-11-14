---
description: Run the Playwright web end-to-end suite against the Expo web build and report results.
---

$ARGUMENTS

Delegate to the `nova-e2e` subagent. If the input above names specific flows or spec files, pass them through so it runs only those; otherwise it runs the full root `e2e/` web suite (`npm run web` from `e2e/`) against the already-running web build and API it is pointed at. Relay its report as-is: passed/failed/flaky counts, failing specs with trace/screenshot paths, any missing-testID gaps, and the PASS / PASS WITH FLAKES / BLOCK verdict. Do not edit application code in response to failures — surface them, and fix them through a `/feature` task.
