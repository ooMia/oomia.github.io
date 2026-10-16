# Font loading comparison, 2026-10-16

This is a controlled Home navigation comparison, not public Pages or Article performance evidence. Both builds used Docs `5a2eaff17e6a8136d32c4eb9a32211adde0b9317`, Lighthouse 13.4.1, Google Chrome 155.0.8059.39, the same Ubuntu runner and the existing compressed static server/profiles. Each viewport/build has three successful runs with no runtime errors or run warnings.

Accepted comparison: baseline `4431d23140a42e13835e0fb7650ec84e590f6712` → candidate `41da6f67679eed47f2b6e75fd729cd42a3c12904`. [Run and raw reports/traces/audit inventory](https://github.com/ooMia/oomia.github.io/actions/runs/38897618772).

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

Mobile FCP ≤1.8s is met here; LCP ≤2.5s is not. Provider internals, Pages CDN latency/headers and all Article routes remain outside this measurement. The earlier audit-ID cause/owner ledger remains in [the navigation evidence](lighthouse-navigation/README.md). [Astro Fonts](https://docs.astro.build/en/guides/fonts/) and [Fontsource](https://fontsource.org/docs/getting-started/introduction) own the supported loading paths.
