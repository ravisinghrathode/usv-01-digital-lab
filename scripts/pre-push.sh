#!/bin/sh
# USV-01 Digital Lab — ChatGPT Pre-Push Verification Hook

if [ "$GIT_CHATGPT_BYPASS" = "1" ]; then
  echo "⚠️  [Git Pre-Push Hook] Manual bypass active (GIT_CHATGPT_BYPASS=1). Proceeding with push."
  exit 0
fi

echo "\n🛡️  [Git Pre-Push Hook] Triggering automated ChatGPT review gate..."
npm run chatgpt:verify

STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "\n🚫 [Git Pre-Push Hook] Push aborted: ChatGPT rejected the code or verification failed (exit code $STATUS)."
  exit 1
fi

echo "✅ [Git Pre-Push Hook] ChatGPT verification passed. Proceeding with push.\n"
exit 0
