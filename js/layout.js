// Shared world coordinates keep the canal, bridge, gate, and road opening aligned.
export const layout = Object.freeze({
  near: 12,
  far: -110,
  entranceZ: -12,
  entranceHalfWidth: 3.2,
  fenceX: -18.6,
  canalLeft: -14.2,
  canalRight: -10.6,
  houseX: -31.5,
  internalRoadLeft: -26.2,
  internalRoadRight: -21,
});

export const isEntrance = (z, padding = 0) =>
  Math.abs(z - layout.entranceZ) < layout.entranceHalfWidth + padding;

export const leftParkHeight = x => {
  const center = (layout.fenceX + layout.canalLeft) / 2;
  const halfWidth = (layout.canalLeft - layout.fenceX) / 2;
  return 0.08 + Math.max(0, 0.35 * (1 - ((x - center) / halfWidth) ** 2));
};
