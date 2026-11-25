#!/usr/bin/env python3
"""Read-only look at what the Testing project actually STORES, for the time-zone cases (stored as UTC?).

    python3 cop/db_read.py column tenant_appointments appointment_start
    python3 cop/db_read.py row    tenant_appointments <id> appointment_start,appointment_end
    python3 cop/db_read.py rows   tenant_audit_logs entity_id=eq.<id> action,entity_type

Only HTTP GET against the Testing project's PostgREST endpoint; refuses any other project. The service-role key is read from the
backend's .env-testing at run time and is never printed or passed on: this helper is called by the specs as its own process, so
the Playwright process never holds it (cop/uat_env.py deliberately does not forward it).
Output is JSON: for `column` the database type, for `row` the stored values exactly as the database returns them.
"""
import json, os, re, sys, urllib.parse, urllib.request

TESTING_REF = "ptcclwkribsicydlxeyi"
ENV_FILE = os.environ.get("NC_TESTING_ENV_FILE", os.path.expanduser("~/Projects/NovaClinics/novaclinicspro-api/novaclinicspro-api/.env-testing"))
vals = {}
for line in open(ENV_FILE):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); v = v.strip()
        if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'": v = v[1:-1]
        vals[k.strip()] = v
m = re.match(r"https://([a-z0-9]+)\.supabase\.co", vals.get("SUPABASE_URL", ""))
if not m or m.group(1) != TESTING_REF: sys.exit("refusing: not the Testing project")
key = vals.get("SUPABASE_SERVICE_ROLE_KEY") or sys.exit("no service key in the Testing env file")
base = vals["SUPABASE_URL"] + "/rest/v1/"
get = lambda url, extra=None: json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}", **(extra or {})}), timeout=30))

if sys.argv[1] == "column":
    spec = get(base, {"Accept": "application/openapi+json"})
    prop = spec["definitions"][sys.argv[2]]["properties"][sys.argv[3]]
    print(json.dumps({"table": sys.argv[2], "column": sys.argv[3], "type": prop.get("format") or prop.get("type")}))
elif sys.argv[1] == "row":
    rows = get(base + sys.argv[2] + "?" + urllib.parse.urlencode({"id": "eq." + sys.argv[3], "select": sys.argv[4]}))
    print(json.dumps(rows[0] if rows else None))
elif sys.argv[1] == "rows":
    key_name, _, key_value = sys.argv[3].partition("=")
    print(json.dumps(get(base + sys.argv[2] + "?" + urllib.parse.urlencode({key_name: key_value, "select": sys.argv[4], "limit": "50"}))))
else:
    sys.exit("usage: column <table> <col> | row <table> <id> <cols> | rows <table> <column=filter> <cols>")
