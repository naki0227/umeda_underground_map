import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNavigationState } from '../useNavigationState';

describe('useNavigationState', () => {
  it('starts at locate phase', () => {
    const { result } = renderHook(() => useNavigationState());
    expect(result.current.phase).toBe('locate');
    expect(result.current.currentNodeId).toBeNull();
  });

  it('moves to destination after confirming location', () => {
    const { result } = renderHook(() => useNavigationState());
    act(() => result.current.confirmLocation('wt-c1'));
    expect(result.current.phase).toBe('destination');
    expect(result.current.currentNodeId).toBe('wt-c1');
  });

  it('moves to route after choosing destination', () => {
    const { result } = renderHook(() => useNavigationState());
    act(() => result.current.confirmLocation('wt-c1'));
    act(() => result.current.chooseDestination('dm-circle'));
    expect(result.current.phase).toBe('route');
    expect(result.current.destinationNodeId).toBe('dm-circle');
  });

  it('keeps the destination when lost and resumes routing after re-locating', () => {
    const { result } = renderHook(() => useNavigationState());
    act(() => result.current.confirmLocation('wt-c1'));
    act(() => result.current.chooseDestination('dm-circle'));
    act(() => result.current.markLost());
    expect(result.current.phase).toBe('locate');
    expect(result.current.currentNodeId).toBeNull();
    expect(result.current.destinationNodeId).toBe('dm-circle');
    act(() => result.current.confirmLocation('wt-izumi'));
    expect(result.current.phase).toBe('route');
    expect(result.current.currentNodeId).toBe('wt-izumi');
  });

  it('clears destination on new search', () => {
    const { result } = renderHook(() => useNavigationState());
    act(() => result.current.confirmLocation('wt-c1'));
    act(() => result.current.chooseDestination('dm-circle'));
    act(() => result.current.newSearch());
    expect(result.current.phase).toBe('destination');
    expect(result.current.destinationNodeId).toBeNull();
  });

  it('stores and clears the destination label (POI name)', () => {
    const { result } = renderHook(() => useNavigationState());
    act(() => result.current.confirmLocation('wt-c1'));
    act(() => result.current.chooseDestination('wt-exit-h8', { ja: 'HEP FIVE', en: 'HEP FIVE' }));
    expect(result.current.destinationLabel?.ja).toBe('HEP FIVE');
    // 迷っても目的地ラベルは保持される
    act(() => result.current.markLost());
    expect(result.current.destinationLabel?.ja).toBe('HEP FIVE');
    // 目的地を選び直すとクリアされる
    act(() => result.current.newSearch());
    expect(result.current.destinationLabel).toBeNull();
    // ラベルなし選択ではnullのまま
    act(() => result.current.chooseDestination('dm-circle'));
    expect(result.current.destinationLabel).toBeNull();
  });
});
