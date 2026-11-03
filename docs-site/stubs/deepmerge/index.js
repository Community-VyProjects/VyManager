"use strict";

// GHSA-gcqx-w48m-w2h4: deepmerge <= 4.3.1 allows prototype poisoning and
// has no patched release. @svgr/plugin-svgo 8.1.0 declares deepmerge but
// never loads it, so docs-site overrides it with this stub. Throw instead
// of merging so a future caller fails the build rather than running an
// unguarded merge.
throw new Error(
  "deepmerge is stubbed out in docs-site (GHSA-gcqx-w48m-w2h4). " +
    "A dependency now loads it; pick a maintained replacement before removing the override."
);
