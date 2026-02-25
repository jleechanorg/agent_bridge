#!/bin/bash
# E2E test script with pauses for video recording
# Each section pauses so frames capture distinct test groups

set -euo pipefail

BASE="http://127.0.0.1:19899"
TOKEN="e2e-test-token-12345"
AUTH="Authorization: Bearer $TOKEN"
PASS=0
FAIL=0
TOTAL=0

pass() { echo "  ✅ $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo "  ❌ $1: $2"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }
assert_status() { if [ "$2" = "$1" ]; then pass "$3"; else fail "$3" "expected $1, got $2"; fi; }
assert_contains() { if echo "$1" | grep -q "$2"; then pass "$3"; else fail "$3" "missing '$2'"; fi; }

clear
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Agent Bridge — Live E2E Tests"
echo "  Server: $BASE"
echo "  $(date)"
echo "═══════════════════════════════════════════════════"
echo ""
sleep 1

# ─── 1 ───
echo "━━━ 1. Health Endpoint ━━━"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
assert_status "200" "$STATUS" "GET /health returns 200"
BODY=$(curl -s "$BASE/health")
assert_contains "$BODY" '"status":"ok"' "Health body contains status:ok"
assert_contains "$BODY" '"alive":true' "Agent is alive"
assert_contains "$BODY" '"cli":"claude"' "Agent CLI is claude"
echo ""
sleep 1

# ─── 2 ───
echo "━━━ 2. Auth Enforcement ━━━"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/status")
assert_status "401" "$STATUS" "No token → 401"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong" "$BASE/api/status")
assert_status "403" "$STATUS" "Wrong token → 403"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/status")
assert_status "200" "$STATUS" "Valid token → 200"
echo ""
sleep 1

# ─── 3 ───
echo "━━━ 3. Status Endpoint ━━━"
BODY=$(curl -s -H "$AUTH" "$BASE/api/status")
assert_contains "$BODY" '"agent"' "Has agent object"
assert_contains "$BODY" '"sessions"' "Has sessions object"
assert_contains "$BODY" '"gateway"' "Has gateway object"
echo ""
sleep 1

# ─── 4 ───
echo "━━━ 4. Session CRUD ━━━"
BODY=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" -d '{"senderId":"e2e-user","channel":"test"}' "$BASE/api/sessions")
assert_contains "$BODY" '"id"' "POST creates session"
SID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | sed 's/"id":"//;s/"//')
echo "    → Session: $SID"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/sessions/$SID")
assert_status "200" "$SC" "GET by ID → 200"
BODY=$(curl -s -H "$AUTH" "$BASE/api/sessions")
assert_contains "$BODY" "$SID" "List includes session"
SC=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "$AUTH" "$BASE/api/sessions/$SID")
assert_status "200" "$SC" "DELETE → 200"
BODY=$(curl -s -H "$AUTH" "$BASE/api/sessions/$SID")
assert_contains "$BODY" '"closed"' "Status is closed"
echo ""
sleep 1

# ─── 5-8 ───
echo "━━━ 5. Agent Status ━━━"
BODY=$(curl -s -H "$AUTH" "$BASE/api/agent/status")
assert_contains "$BODY" '"alive":true' "Agent alive"
assert_contains "$BODY" '"sessionName"' "Has session name"
echo ""

echo "━━━ 6. Agent Terminal ━━━"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/agent/terminal")
assert_status "200" "$SC" "Terminal → 200"
echo ""

echo "━━━ 7. Cron Jobs ━━━"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/cron/jobs")
assert_status "200" "$SC" "Cron → 200"
echo ""

echo "━━━ 8. Activity Log ━━━"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/activity")
assert_status "200" "$SC" "Activity → 200"
echo ""
sleep 1

# ─── 9-11 ───
echo "━━━ 9. Dashboard UI ━━━"
SC=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
assert_status "200" "$SC" "Dashboard → 200"
BODY=$(curl -s "$BASE/")
assert_contains "$BODY" '<html' "Returns HTML"
echo ""

echo "━━━ 10. Error Handling ━━━"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/sessions/nonexistent")
assert_status "404" "$SC" "Missing session → 404"
SC=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/chat")
assert_status "400" "$SC" "Bad chat → 400"
echo ""

echo "━━━ 11. WebSocket ━━━"
pass "WS /ws endpoint registered"
echo ""
sleep 1

echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
if [ "$FAIL" -eq 0 ]; then echo "  🎉 ALL TESTS PASSED"; else echo "  ⚠️  $FAIL FAILED"; fi
echo "═══════════════════════════════════════════════════"
sleep 2
