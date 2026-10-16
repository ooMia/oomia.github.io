# Font loading comparison, 2026-10-16

Status recorded on 2026-10-17: resource and FCP improvements are retained, but intermittent mobile LCP/layout-shift behavior is unresolved. Repeated experiments are stopped at the user's request. Issue #85 remains open; the following results do not establish completion of its performance target.

This is a controlled Home navigation comparison, not public Pages or Article performance evidence. Both builds used Docs `5a2eaff17e6a8136d32c4eb9a32211adde0b9317`, Lighthouse 13.4.1, Google Chrome 155.0.8059.39, the same Ubuntu runner and the existing compressed static server/profiles. Each viewport/build has three successful runs with no runtime errors or run warnings.

First external-CSS comparison (provisional timing evidence): baseline `4431d23140a42e13835e0fb7650ec84e590f6712` → candidate `41da6f67679eed47f2b6e75fd729cd42a3c12904`. [Run and raw reports/traces/audit inventory](https://github.com/ooMia/oomia.github.io/actions/runs/38897618772).

| Median | Desktop baseline → candidate | Mobile baseline → candidate |
| --- | --- | --- |
| Performance | 99 → 99 | 85 → 89 |
| FCP | 0.530 → 0.443 s | 1.431 → 1.355 s |
| LCP | 0.771 → 0.839 s | 4.285 → 3.756 s |
| TBT | 0 → 0 ms | 0 → 10 ms |
| CLS | 0.000706 → 0.000707 | 0.001072 → 0.001074 |

Mobile font requests fell 26 → 15, but font transfer **increased** 263,908 → 267,301 B. Variable files share weights; they do not guarantee fewer bytes. Stylesheet transfer fell 72,809 → 44,986 B, and total initial transfer fell 478,004 → 453,776 B. Accessibility, Best Practices, SEO and Agentic Browsing remained 100 in this finite audit. Desktop LCP increased slightly; no universal speedup is claimed.

The earlier [all-API candidate](https://github.com/ooMia/oomia.github.io/actions/runs/38897023008), `5896ec8`, added approximately 79KB of Noto Unicode declarations to each HTML document. Its mobile FCP median regressed 1.429 → 2.180 s while LCP improved 4.286 → 2.861 s. It was superseded. The maintained Fontsource variable stylesheet restores cacheable external Korean CSS without a custom compiler, private Astro imports or character subsetting. Space Grotesk and Literata use Astro's local Fonts API; large Article-only Gowun declarations also remain in route CSS. That later Article-only adjustment preserves the measured Home stylesheet URL/content; this comparison does not establish Article FCP/LCP.

The first workflow attempt stopped before measurement because the downloaded testing browser did not open its debugging port. The successful runs use Ubuntu's installed Chrome through the harness's existing `LIGHTHOUSE_CHROME_PATH` option. No sandbox-disabling flags or host security changes were introduced. The [official Ubuntu/AppArmor guidance](https://pptr.dev/troubleshooting#issues-with-apparmor-on-ubuntu) explains the relevant binary-path restriction; the failed attempt did not retain enough browser stderr to prove that specific cause.

A repeat at `800b181` ([run](https://github.com/ooMia/oomia.github.io/actions/runs/38898578907)) preserved the resource reductions and mobile FCP improvement (1.579→1.353s), but reversed the LCP comparison (2.105→3.758s). Its baseline LCP values ranged 1.879–4.285s despite the same source/bytes; the candidate ranged 2.858–3.758s. Therefore the first table does not establish a robust LCP improvement. The LCP element remained the same featured image and its discovery checks passed. The raw render delay also varied; its specific cause is unresolved.

A synchronous critical-image decoding probe at `7646261` ([run](https://github.com/ooMia/oomia.github.io/actions/runs/38899079465)) did not consistently improve that behavior and was reverted. It is not a retained product rule. The harness additionally supports `--throttling-method devtools` for request-level network/CPU throttling. Both modes have limitations described in [Lighthouse throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md); a different mode is not a substitute for a public audit.

The first request-level throttling comparison at `06d9a93` ([run](https://github.com/ooMia/oomia.github.io/actions/runs/38899590496)) improved mobile FCP 1.846 → 1.654 s but regressed median LCP 2.384 → 4.312 s and CLS 0.000702 → 0.122156. Its filmstrip showed the featured copy moving down when the cover appeared. The next change makes the image inherit its container's aspect ratio while keeping its natural height; it does not retain the decoding experiment.

Final code candidate `8a1ec100c642bb00d949fece6cf98769b22d3e9c`, same baseline and request-level throttling ([run and raw artifacts](https://github.com/ooMia/oomia.github.io/actions/runs/38900666514)):

| Median | Desktop baseline → candidate | Mobile baseline → candidate |
| --- | --- | --- |
| Performance | 100 → 100 | 97 → 98 |
| FCP | 0.148 → 0.138 s | 1.841 → 1.648 s |
| LCP | 0.264 → 0.145 s | 2.381 → 2.256 s |
| TBT | 0 → 0 ms | 40.5 → 41.7 ms |
| CLS | 0.000706 → 0.000707 | 0.000702 → 0.001180 |

These medians conceal an unresolved outlier. The three mobile candidate LCP values were **4.312 / 2.199 / 2.256 s**, with CLS **0.122156 / 0.001180 / 0.000765**. Baseline LCP was 2.364 / 5.265 / 2.381 s; baseline CLS was 0.000596 / 0.107697 / 0.000702. The cover-ratio change improved this batch's medians, but did not reliably eliminate the slow-load shift. Its remaining trigger and the LCP variability are unresolved Site work, not a proven provider or browser defect. No further retries or speculative fixes are included.

In that final mobile comparison, initial transfer fell **477,370 → 453,076 B** (about 5.1%). Font requests remained 26 → 15, font bytes increased 263,908 → 267,301 B, and stylesheet bytes fell 72,809 → 44,986 B. These resource changes are more consistent than the timing results; do not describe them as reduced font bytes or a universal LCP improvement.

The focused theme/CSP/loading check also exposed small fonts being inlined as `data:` URLs ([failed check](https://github.com/ooMia/oomia.github.io/actions/runs/38898334345)). The retained fix prevents font-file inlining and preserves `font-src 'self'`; the same ten desktop/mobile checks [passed at `800b181`](https://github.com/ooMia/oomia.github.io/actions/runs/38898575185). CSP was not relaxed to satisfy the test. Subsequent product changes only adjust the cover ratio.

Mobile FCP ≤1.8s is met in the recorded candidate medians; reliable LCP ≤2.5s and elimination of the intermittent shift are **not established**. Provider internals, Pages CDN latency/headers and all Article routes remain outside this measurement. No merge, deployment or public performance audit is claimed. The earlier audit-ID cause/owner ledger remains in [the navigation evidence](lighthouse-navigation/README.md). [Astro Fonts](https://docs.astro.build/en/guides/fonts/) and [Fontsource](https://fontsource.org/docs/getting-started/introduction) own the supported loading paths.
