# PR Checklist — v1.0 "Concrete Dawn"
- [ ] `npm ci` clean
- [ ] `npm test` — 6 suites green (combat, store, world, director, integration, audio)
- [ ] `npm run build` — tsc zero errors, dist/ emitted
- [ ] Ledger anchor updated in PR body
- [ ] ADRs appended for any deviation from scenario/*.md canon
- [ ] LFS: no binaries committed without .gitattributes rules
- [ ] Save format change? → bump `SAVE_KEY` suffix
