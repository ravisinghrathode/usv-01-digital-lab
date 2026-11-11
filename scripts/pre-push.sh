#!/bin/sh
# USV-01 Digital Lab — Pre-Push Verification Hook
# Enforces local quality gates & executes advisory ChatGPT review

echo "\n🛡️  [Pre-Push Hook] Running deterministic verification suite (lint, test, build check)..."

npm run lint
if [ $? -ne 0 ]; then
  echo "\n🚫 [Pre-Push Hook] Push aborted: Typecheck / Lint failed."
  exit 1
fi

npm test
if [ $? -ne 0 ]; then
  echo "\n🚫 [Pre-Push Hook] Push aborted: Unit and safety test suite failed."
  exit 1
fi

if [ "$GIT_CHATGPT_BYPASS" = "1" ]; then
  echo "⚠️  [Pre-Push Hook] Advisory ChatGPT review bypassed via GIT_CHATGPT_BYPASS=1."
  echo "✅ [Pre-Push Hook] Deterministic tests passed. Push permitted.\n"
  exit 0
fi

echo "\n🤖 [Pre-Push Hook] Triggering advisory ChatGPT pre-push review..."
npm run chatgpt:verify

STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "\n🚫 [Pre-Push Hook] Push aborted: ChatGPT advisory review rejected the code (exit code $STATUS)."
  exit 1
fi

echo "✅ [Pre-Push Hook] All pre-push checks passed successfully. Proceeding with push.\n"
exit 0
