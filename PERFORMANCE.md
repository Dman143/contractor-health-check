# Report-generation performance

## Pipeline profile

The report-generation request does not create a PDF or send email. Those actions
only run later when the user explicitly downloads or emails the completed report.
The critical path is therefore:

| Stage | Before | After / budget | Finding |
| --- | ---: | ---: | --- |
| Browser request + server body parsing | <10 ms | <10 ms | Not a material bottleneck. |
| Prompt preparation and JSON serialization | <2 ms | <2 ms | CPU cost is negligible, but the serialized request was 6,638 bytes. It is now 4,165 bytes (37% smaller) for the representative test assessment. |
| OpenAI inference/network | ~60 s | <18 s target | Dominant bottleneck. The old request left reasoning and verbosity at model defaults. The optimized request explicitly uses minimal reasoning and low verbosity while retaining all 25 answers and the strict report schema. |
| OpenAI envelope + structured-output parsing | <2 ms | <2 ms | Two parses are necessary: one for the Responses API envelope and one for its JSON-schema output string. No intermediate parse/stringify remains. |
| Response serialization + browser render | <10 ms | <10 ms | Not a material bottleneck. |
| PDF generation | Not on critical path; typically <25 ms in the automated PDF suite | unchanged | It is synchronous, dependency-free, and only runs after the report is visible, so changing it cannot improve initial report latency. |
| **Total visible report generation** | **~60 s** | **<18.1 s successful-request budget** | The OpenAI call remains effectively the whole critical path. |

“Before” latency is the observed production figure supplied for this optimization;
local stage timings and payload sizes use the representative assessment in
`tests/openai-retry.test.ts`. A live OpenAI timing was not fabricated when no API
key was available in the development environment.

## Production measurement

Every successful `/api/consulting-insights` response now emits a `Server-Timing`
header with `body`, `generate`, `total`, and `serialize` durations. Server logs also
record prompt preparation, OpenAI round-trip, response read/parse, and complete
route timings, plus OpenAI's own `openai-processing-ms` response header when it is
available. This separates provider inference from application overhead without
logging assessment contents or model output.

For a production sample, inspect the request in browser developer tools or run:

```sh
curl -i -H 'content-type: application/json' \
  --data @assessment.json https://tradebuilt.pro/api/consulting-insights
```

The optimized call has an 18-second attempt deadline so a successful generation
cannot silently consume the old 60-second window. One timeout retry is retained
for transient transport failures; retry latency is failure recovery rather than a
successful report-generation measurement.

## Quality safeguards

- Every business-profile value, category score/benchmark/gap, and all 25 practice
  ratings remain in the prompt. Only repeated property names and redundant answer
  labels were removed.
- The same strict schema still requires the full executive summary, eight category
  diagnoses, three priorities, four three-action weeks, quick wins, risk, outcome,
  and final recommendation.
- Existing sequence and score validation rejects structurally valid but incorrect
  model output.
- The 3,200-token output ceiling constrains runaway verbosity rather than report
  sections; the schema and concise advisory style remain unchanged.
