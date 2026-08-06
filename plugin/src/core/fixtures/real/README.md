# Real handoff fixture pairs

Each subfolder is a before/after pair of a Figma frame captured in the shape of
the Figma REST API (`GET /v1/files/:key/nodes?ids=:id`). They feed
`loadSnapshotFromFigmaExport` and drive the diff calibration harnesses (A-03,
A-04).

| Pair | Scenario | Exercises |
| --- | --- | --- |
| `checkout` | Text edit + button resize + added error state | added, content, layout |
| `card` | Fill, corner radius, padding, font size | visual, layout, typography |
| `nav` | Removed item + variant state change | removed, structural, component |

## Status & honesty note

These are **representative** REST-shaped handoffs authored to mirror common
real-world change patterns — not captures from a live Figma account (none was
available in this environment). See DEC-017. They are still valid for exercising
the loader and diff engine, but for trustworthy accuracy numbers they should be
replaced/augmented with genuine captures.

## How to capture a real pair

1. Get a Figma personal access token (Account settings → Personal access tokens).
2. Note the file key and the node id of the frame/section (right-click → Copy link).
3. Before design change:
   ```
   curl -H "X-Figma-Token: $TOKEN" \
     "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID" \
     | jq '.nodes[$NODE_ID].document' > before.json
   ```
4. Make the design change, then repeat step 3 into `after.json`.
5. Drop both under a new `fixtures/real/<name>/` folder and add an entry to
   `pairs.ts`.

The loader reads only supported properties; the rest of the payload is ignored,
so raw exports can be dropped in without trimming.
