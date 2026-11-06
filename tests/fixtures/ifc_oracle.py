# Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
# MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
"""The IFC oracle for the RACI matrix's saved .ifc: IfcOpenShell, independent of the contracts STEP codec.

    python -I tests/fixtures/ifc_oracle.py <file.ifc> <expect.json>     (prints one JSON line, exit 0 = holds)

  - ifcopenshell.validate (schema + EXPRESS rules): 0 errors
  - one apk.raci/2 IfcWorkSchedule declared in the project, one IfcTask per deliverable
  - each role an IfcActor whose TheActor is an IfcOrganization with its IfcActorRole
  - each R/A/C/I cell an IfcRelAssignsToActor with ActingRole USERDEFINED Responsible|Accountable|Consulted|Informed,
    read back into the same matrix; every task with an Accountable has exactly one (the IDS rule of bom-fm-3)
Exit 3 when IfcOpenShell is not installed (the node test then skips).
"""
import json
import sys

try:
    import ifcopenshell
    import ifcopenshell.util.sequence as Q
    import ifcopenshell.validate as V
except ImportError:
    print(json.dumps({"skip": "ifcopenshell not installed"}))
    sys.exit(3)

WORDS = {"Responsible": "R", "Accountable": "A", "Consulted": "C", "Informed": "I"}


def main(path, expect_path):
    want = json.load(open(expect_path, encoding="utf-8"))
    f = ifcopenshell.open(path)
    problems = []
    log = V.json_logger()
    V.validate(f, log, express_rules=True)
    problems += ["validate: %s" % str(s.get("message", s))[:300] for s in log.statements]
    ws = [w for w in f.by_type("IfcWorkSchedule") if w.Identification == "apk.raci/2"]
    if len(ws) != 1:
        print(json.dumps({"ok": False, "problems": ["%d apk.raci/2 schedules" % len(ws)]}))
        return 1
    ws = ws[0]
    if not any(r.RelatingContext.is_a("IfcProject") for r in ws.HasContext):
        problems.append("schedule not declared in the project")
    tasks = {t.Identification: t for t in Q.get_root_tasks(ws)}
    got = {}
    for tid, t in tasks.items():
        cells = {}
        for rel in t.HasAssignments:
            if not rel.is_a("IfcRelAssignsToActor"):
                continue
            actor = rel.RelatingActor
            org = actor.TheActor
            if not org.is_a("IfcOrganization") or not org.Roles:
                problems.append("actor %s has no organisation with a role" % actor.Name)
            role = rel.ActingRole
            if not role or role.Role != "USERDEFINED" or role.UserDefinedRole not in WORDS:
                problems.append("task %s: acting role %s" % (tid, role))
                continue
            cells[org.Name] = WORDS[role.UserDefinedRole]
        if list(cells.values()).count("A") > 1:
            problems.append("task %s has %d Accountable" % (tid, list(cells.values()).count("A")))
        got[tid] = cells
    for t in want["tasks"]:
        cells = {k: v for k, v in t["raci"].items() if v != "-"}
        if got.get(t["id"]) != cells:
            problems.append("task %s: %s, the matrix says %s" % (t["id"], got.get(t["id"]), cells))
        if tasks.get(t["id"]) is not None and tasks[t["id"]].Name != t["task"]:
            problems.append("task %s named %s" % (t["id"], tasks[t["id"]].Name))
    for role, info in want["roleInfo"].items():
        orgs = [a.TheActor for a in f.by_type("IfcActor") if a.TheActor.is_a("IfcOrganization") and a.TheActor.Identification == info["id"]]
        if len(orgs) != 1 or orgs[0].Name != role or orgs[0].Roles[0].Role != info["ifcRole"]:
            problems.append("role %s: %s" % (role, orgs))
    print(json.dumps({"ok": not problems, "problems": problems[:40], "validate_errors": len(log.statements), "tasks": len(tasks)}))
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
