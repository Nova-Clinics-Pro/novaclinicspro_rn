#!/usr/bin/env python3
"""Run a command with the TESTING configuration only, taken from the backend's .env-testing (never printed).

    python3 cop/uat_env.py npx tsx cop/seed.ts --plan

Passes exactly three values on: the Testing Supabase URL, its public anon key and the local API address. Nothing else
from the file (no service-role key, no database URL) reaches the child process, and the rest of your environment is
dropped. Refuses to start unless the URL is the Testing project.
"""
import os, re, sys

TESTING_REF = "ptcclwkribsicydlxeyi"
ENV_FILE = os.environ.get("NC_TESTING_ENV_FILE", os.path.expanduser("~/Projects/NovaClinics/novaclinicspro-api/novaclinicspro-api/.env-testing"))

vals = {}
for line in open(ENV_FILE):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        vals[k.strip()] = v

m = re.match(r"https://([a-z0-9]+)\.supabase\.co", vals.get("SUPABASE_URL", ""))
if not m or m.group(1) != TESTING_REF:
    sys.exit(f"refusing to start: SUPABASE_URL in {ENV_FILE} is not the Testing project")
if not vals.get("SUPABASE_ANON_KEY"):
    sys.exit("refusing to start: SUPABASE_ANON_KEY missing in the Testing env file")

env = {"PATH": os.environ["PATH"], "HOME": os.environ["HOME"],
       "NC_SUPABASE_URL": vals["SUPABASE_URL"], "NC_SUPABASE_ANON_KEY": vals["SUPABASE_ANON_KEY"],
       "NC_API_BASE_URL": os.environ.get("NC_API_BASE_URL", "http://localhost:8000"), "NC_ALLOWED_SUPABASE_REF": TESTING_REF}
for k in ("NC_RUN_ID", "NC_EMAIL_DOMAIN", "NC_RESULTS_ROOT", "NC_WEB_BASE_URL"):
    if k in os.environ:
        env[k] = os.environ[k]
os.execvpe(sys.argv[1], sys.argv[1:], env)
