export interface StepperViewport {
  readonly itemX: number;
  readonly itemWidth: number;
  readonly contentWidth: number;
  readonly viewportWidth: number;
}

/** Centers a measured item while respecting the real scrollable bounds. */
export const getStepperScrollOffset = ({
  itemX,
  itemWidth,
  contentWidth,
  viewportWidth,
}: StepperViewport): number => {
  if (viewportWidth <= 0 || contentWidth <= viewportWidth) return 0;
  const ideal = itemX + itemWidth / 2 - viewportWidth / 2;
  return Math.min(Math.max(0, ideal), Math.max(0, contentWidth - viewportWidth));
};
