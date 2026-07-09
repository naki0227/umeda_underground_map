import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMapNavigation } from '../useMapNavigation';
import type { Place } from '../../map/InteractiveMap';

const hepFive: Place = {
  nodeId: 'wt-exit-h8',
  name: { ja: 'HEP FIVE', en: 'HEP FIVE' },
  aboveGround: true,
};
const izumi: Place = {
  nodeId: 'wt-izumi',
  name: { ja: '泉の広場', en: 'Izumi Plaza' },
  aboveGround: false,
};

describe('useMapNavigation', () => {
  it('starts with no sheet and no location', () => {
    const { result } = renderHook(() => useMapNavigation());
    expect(result.current.sheet).toBe('none');
    expect(result.current.currentNodeId).toBeNull();
    expect(result.current.destination).toBeNull();
  });

  it('opens the place sheet when a place is selected', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(hepFive));
    expect(result.current.sheet).toBe('place');
    expect(result.current.selectedPlace?.nodeId).toBe('wt-exit-h8');
  });

  it('asks for location before routing when current location is unknown', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(hepFive));
    act(() => result.current.goToSelected());
    expect(result.current.sheet).toBe('locate');
    expect(result.current.destination?.nodeId).toBe('wt-exit-h8');
    act(() => result.current.confirmLocation('wt-c4'));
    expect(result.current.sheet).toBe('route');
    expect(result.current.currentNodeId).toBe('wt-c4');
  });

  it('routes immediately when current location is already set', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(izumi));
    act(() => result.current.setHereSelected());
    expect(result.current.currentNodeId).toBe('wt-izumi');
    expect(result.current.sheet).toBe('none');
    act(() => result.current.selectPlace(hepFive));
    act(() => result.current.goToSelected());
    expect(result.current.sheet).toBe('route');
  });

  it('keeps the destination when lost and resumes after re-locating', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(izumi));
    act(() => result.current.setHereSelected());
    act(() => result.current.selectPlace(hepFive));
    act(() => result.current.goToSelected());
    act(() => result.current.markLost());
    expect(result.current.sheet).toBe('locate');
    expect(result.current.currentNodeId).toBeNull();
    expect(result.current.destination?.nodeId).toBe('wt-exit-h8');
    act(() => result.current.confirmLocation('dm-circle'));
    expect(result.current.sheet).toBe('route');
  });

  it('clears the destination and closes the sheet', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(izumi));
    act(() => result.current.setHereSelected());
    act(() => result.current.selectPlace(hepFive));
    act(() => result.current.goToSelected());
    act(() => result.current.clearDestination());
    expect(result.current.sheet).toBe('none');
    expect(result.current.destination).toBeNull();
  });

  it('closeSheet returns to route sheet while navigating', () => {
    const { result } = renderHook(() => useMapNavigation());
    act(() => result.current.selectPlace(izumi));
    act(() => result.current.setHereSelected());
    act(() => result.current.selectPlace(hepFive));
    act(() => result.current.goToSelected());
    act(() => result.current.selectPlace(izumi));
    expect(result.current.sheet).toBe('place');
    act(() => result.current.closeSheet());
    expect(result.current.sheet).toBe('route');
  });
});
