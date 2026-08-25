# Security Policy

## Supported versions

Security fixes are targeted at the `main` branch and the most recent tagged version. Older tags may not receive backports. The current repository version is `0.9.8`.

## Reporting a vulnerability

Please do not disclose an exploitable vulnerability in a public issue.

1. Prefer GitHub Private Vulnerability Reporting at `https://github.com/BALIUJUNAN/abyssal-whispers/security/advisories/new` if the repository has that feature enabled.
2. If private reporting is unavailable, open a public issue titled **Security contact request** without exploit details, secrets, personal data or reproduction steps, and ask the maintainer to arrange a private channel.

Include the affected version/commit, impact, prerequisites, minimal reproduction, and any suggested mitigation. Remove real API keys and personal data from reports.

The project does not currently promise a bug bounty or a fixed response SLA. The maintainer will aim to acknowledge a private report, assess severity, prepare a fix, and coordinate disclosure without exposing users unnecessarily.

## Security scope

Relevant areas include:

- save import/export validation, prototype pollution and migration behavior;
- UGC/mod import, schema validation and script/HTML injection;
- API-key storage or unintended transmission by the optional GLM integration;
- cross-site scripting, unsafe URL handling and Content Security Policy gaps;
- Tauri capabilities, filesystem access and desktop packaging;
- dependency vulnerabilities that affect the shipped application;
- reproducible denial of service or data loss caused by untrusted input.

Reports about story content, balancing, unsupported old versions, or third-party service availability are normally not security vulnerabilities. Third-party dependency issues should still be reported when they are exploitable through this project.

## Handling sensitive data

Browser saves, settings and optional GLM credentials are stored locally by the current application. Do not attach real saves or credentials to public issues. Use synthetic data and redact tokens, user paths and identifying information.
