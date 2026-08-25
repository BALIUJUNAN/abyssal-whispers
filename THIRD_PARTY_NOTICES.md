# Third-Party Notices and Provenance Status

This file is an inventory aid, not a substitute for the complete license texts or legal review. Versions are the versions resolved by the current lockfiles or installed metadata at the time of this audit. Transitive dependencies remain governed by their own package metadata and licenses.

## JavaScript and build dependencies

The following direct packages are declared by `package.json`. The complete resolved graph, integrity hashes and package license metadata are recorded in `package-lock.json`.

| Package                  | Resolved version | Declared license  |
| ------------------------ | ---------------: | ----------------- |
| `@tauri-apps/cli`        |           2.11.2 | Apache-2.0 OR MIT |
| `@types/react`           |          19.2.17 | MIT               |
| `@types/react-dom`       |           19.2.3 | MIT               |
| `immer`                  |           11.1.8 | MIT               |
| `react`                  |           19.2.7 | MIT               |
| `react-dom`              |           19.2.7 | MIT               |
| `typescript`             |            6.0.3 | Apache-2.0        |
| `vite-plugin-singlefile` |            2.3.3 | MIT               |
| `zod`                    |            4.4.3 | MIT               |
| `zustand`                |           5.0.14 | MIT               |
| `@babel/cli`             |           7.28.6 | MIT               |
| `@babel/preset-react`    |           7.28.5 | MIT               |
| `@playwright/test`       |           1.62.1 | Apache-2.0        |
| `@vitejs/plugin-react`   |            6.0.2 | MIT               |
| `playwright`             |           1.62.1 | Apache-2.0        |
| `prettier`               |            3.8.4 | MIT               |
| `terser`                 |           5.48.0 | BSD-2-Clause      |
| `vite`                   |           8.0.16 | MIT               |

Playwright may download a Chromium build for testing. That browser is not committed to this repository or copied into the game distribution and is governed by its own notices.

## Rust and Tauri dependencies

The following direct crates are declared in `src-tauri/Cargo.toml`; resolved versions come from `src-tauri/Cargo.lock` and license expressions from the cached crate metadata.

| Crate              | Resolved version | Declared license  |
| ------------------ | ---------------: | ----------------- |
| `tauri`            |           2.11.2 | Apache-2.0 OR MIT |
| `tauri-build`      |            2.6.2 | Apache-2.0 OR MIT |
| `tauri-plugin-log` |            2.8.0 | Apache-2.0 OR MIT |
| `serde`            |          1.0.228 | MIT OR Apache-2.0 |
| `serde_json`       |          1.0.150 | MIT OR Apache-2.0 |
| `log`              |           0.4.30 | MIT OR Apache-2.0 |

The complete transitive Rust graph is recorded in `src-tauri/Cargo.lock`.

## Python audio-generation utilities

`zhus/requirements.txt` declares `gradio_client>=0.6.0` and `tqdm>=4.66.0` without locked versions. Their applicable licenses must be checked for the versions actually installed. These tools are not part of the browser runtime.

The utilities call a separately operated Gradio endpoint and select an audio-generation model through that service. Repository files do not document the service operator, exact model/checkpoint license, generation dates, or a per-output provenance mapping. Service and model terms therefore require separate verification.

## CI actions and external services

The GitHub Actions workflow invokes third-party actions including `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact`, `peaceiris/actions-gh-pages` and `softprops/action-gh-release`. They execute in CI under their respective upstream licenses and are not copied into the game bundle.

The optional narrative feature calls the Z.AI/GLM API. The API service and model outputs are governed by the provider's current terms; the provider is not bundled or relicensed by this repository.

CSS names Noto Sans SC, Noto Serif SC, Source Han Serif SC, LXGW WenKai, JetBrains Mono and several system fallback fonts. No font binary is tracked in this repository, so the names do not themselves redistribute those fonts. If font files are added later, their exact license and attribution must be recorded here.

## Media and creative material requiring provenance review

The following tracked groups have no per-file author/source/license manifest in the current repository:

| Material                           | Current evidence                                                                                        | Required follow-up                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `assets/webp/` (141 WebP)          | Added as an asset library; no per-file source or license metadata                                       | Record creator/source, creation method, date, and rights for each file or batch                         |
| `assets/webp_ending/` (72 WebP)    | No per-file source or license metadata                                                                  | Same as above                                                                                           |
| `audio/` (77 WAV/MP3)              | Generation tooling and prompts exist, but outputs are not mapped to a model/checkpoint or service terms | Record generator/model/checkpoint, service terms, prompt/output mapping, edits, date, and author review |
| `docs/dossier.png`                 | Commit history identifies it as a README dossier image only                                             | Record creator, source file and applicable license                                                      |
| `src-tauri/icons/` (16 icon files) | No source-art or license record                                                                         | Record creator/source and whether icons derive from another image                                       |

Until that review is complete, these groups must not be represented as definitively owner-created or as relicensed third-party material. Their presence in the repository and in the built game is not proof of a commercial-use grant.

## Adding third-party material

For every future third-party or generated asset, record at least: file path, title/description, author or service, source URL, retrieved/generated date, exact license or terms version, required attribution, modification history, and evidence that redistribution is permitted. See `CONTRIBUTING.md`.
