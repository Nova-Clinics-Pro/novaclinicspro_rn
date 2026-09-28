import { getStepperScrollOffset } from '../../features/onboarding/presentation/components/wizardStepperGeometry';

describe('wizard stepper viewport geometry', () => {
  const viewportWidth = 180;
  const contentWidth = 720;
  const width = 90;

  it.each([
    [3, 0, 0],
    [6, 2, 135],
    [8, 7, 540],
  ])('keeps a selected first, middle, or last step within the measured viewport (%i steps)', (_count, index, expected) => {
    expect(getStepperScrollOffset({
      itemX: index * width,
      itemWidth: width,
      contentWidth,
      viewportWidth,
    })).toBe(expected);
  });

  it('does not scroll when every arbitrary-count item already fits', () => {
    expect(getStepperScrollOffset({ itemX: 0, itemWidth: 90, contentWidth: 180, viewportWidth: 180 })).toBe(0);
  });
});
