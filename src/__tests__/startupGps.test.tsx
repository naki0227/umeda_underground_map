import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { initI18n } from '../i18n';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

function mockGeolocation(
  coords: { latitude: number; longitude: number; accuracy: number },
  permission: PermissionState = 'prompt',
) {
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({ coords, timestamp: Date.now() } as GeolocationPosition),
  );
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => ({ state: permission })) },
  });
  return getCurrentPosition;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'permissions');
});

describe('rough location from GPS at startup', () => {
  it('shows the approximate location once on launch and opens the locate sheet on tap', async () => {
    const user = userEvent.setup();
    // JR大阪駅 御堂筋口付近
    const getCurrentPosition = mockGeolocation({
      latitude: 34.7025,
      longitude: 135.4959,
      accuracy: 40,
    });
    render(<App />);
    const hint = await screen.findByTestId('gps-hint');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    await user.click(hint);
    expect(screen.getByRole('dialog', { name: '現在地を確認する' })).toBeInTheDocument();
  });

  it('fetches again only when the locate button is pressed', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = mockGeolocation({
      latitude: 34.7025,
      longitude: 135.4959,
      accuracy: 40,
    });
    render(<App />);
    await screen.findByTestId('gps-hint');
    await user.click(screen.getByRole('button', { name: 'おおよその現在地を表示' }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('says so instead of drawing a marker when outside the map area', async () => {
    // 東京駅
    mockGeolocation({ latitude: 35.6812, longitude: 139.7671, accuracy: 30 });
    render(<App />);
    expect(await screen.findByText('梅田の地下街の地図の範囲外にいるようです')).toBeInTheDocument();
    expect(screen.queryByTestId('gps-hint')).not.toBeInTheDocument();
  });

  it('does not ask again when permission was denied', async () => {
    const getCurrentPosition = mockGeolocation(
      { latitude: 34.7025, longitude: 135.4959, accuracy: 40 },
      'denied',
    );
    render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByTestId('gps-hint')).not.toBeInTheDocument();
  });
});
