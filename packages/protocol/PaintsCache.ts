import { createSingleEntryCache } from "suspense";

import { recordingTargetCache } from "replay-next/src/suspense/BuildIdCache";
import { findIndex } from "replay-next/src/utils/array";
import { replayClient } from "shared/client/ReplayClientContext";
import { TimeStampedPointWithPaintHash } from "shared/client/types";

// This could be a streaming cache, but streaming APIs are more awkward to interop with
// Since we wait for processing to complete before loading a recording, paints should always load very quickly
export const PaintsCache = createSingleEntryCache<[], TimeStampedPointWithPaintHash[] | null>({
  config: { immutable: true },
  debugLabel: "PaintsCache",
  load: async ([]) => {
    const target = await recordingTargetCache.readAsync(replayClient);
    switch (target) {
      case "node": {
        return null;
      }
    }

    return await replayClient.findPaints();
  },
});

export function mostRecentPaint(time: number) {
  const paints = PaintsCache.getValueIfCached() ?? [];

  const index = findIndex(
    paints,
    { paintHash: "", point: "", time },
    (a, b) => a.time - b.time,
    false
  );

  // This is the nearest paint, but it may be before or after the time
  const paint = paints[index];

  if (paint.time <= time) {
    return paint;
  } else if (index > 0) {
    return paints[index - 1];
  } else {
    return null;
  }
}
