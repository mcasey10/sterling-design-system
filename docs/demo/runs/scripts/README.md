# Repeat runs: the run scripts

The scripts the five main runs used, copied from the series' private folder when the series closed (2026-10-28), with
[RUN-STEPS.md](../RUN-STEPS.md), the sheet Michael followed for each run. The top folder holds the scripts as they were
after run 05 (for runs 03–05, as each header says); `run-02/` holds the
earlier versions that runs 01 and 02 used. [deviations.md](../deviations.md) says why each changed.

They ran from `C:\sterling-runs-private\scripts`, and their paths still name the series' folders (`C:\sterling-runs`,
`C:\sterling-runs-done`, `C:\sterling-runs-config`, `C:\sterling-runs-private`), which aren't in this repository.
`-Control` in `5-start.ps1` was for the control runs, which were skipped (deviation 30).

## How these copies differ from the scripts that ran

Only these lines changed, so the copies hold no local paths, personal names, or real agency names:

- **The repository's folder.** The scripts found it from the user's home folder; the copies find it from their own
  place in the repository (`$PSScriptRoot`). Same folder, same behavior. RUN-STEPS.md's one `cd` to it reads
  `cd <the repository's folder>`.
- **`16-public.ps1`'s scan patterns.** The script that ran also matched the maintainer's user name in a path, an old
  folder name, and the two real agency names (allowed only in the loan example's source note). The copy matches any
  user folder in a path instead (`users[/\\][^/\\]+`) and leaves out the folder name and agency names. The banned terms
  still come from a file outside the repository (`-Banned`).
