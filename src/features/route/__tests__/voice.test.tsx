import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { initI18n } from '../../../i18n';
import { RouteScreen } from '../RouteScreen';

const graph = buildGraph(umedaMap);

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

class FakeUtterance {
  lang = '';
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function installSpeech() {
  const synth = { speak: vi.fn(), cancel: vi.fn() };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderRoute = (stepIndex = 0) =>
  render(
    <RouteScreen
      graph={graph}
      fromNodeId="wt-izumi"
      toNodeId="ex-C-93"
      destinationLabel={null}
      aboveGround={false}
      avoidStairs={false}
      onToggleAvoidStairs={() => {}}
      onLost={() => {}}
      onFinish={() => {}}
      onClose={() => {}}
      stepIndex={stepIndex}
      onStepChange={() => {}}
    />,
  );

describe('voice guidance', () => {
  it('reads the next maneuver aloud when turned on, and again when the step changes', async () => {
    const user = userEvent.setup();
    const synth = installSpeech();
    const { rerender } = renderRoute(0);

    const toggle = screen.getByRole('button', { name: '音声案内' });
    expect(synth.speak).not.toHaveBeenCalled();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const first = synth.speak.mock.calls[0][0] as FakeUtterance;
    expect(first.lang).toBe('ja-JP');
    expect(first.text).toMatch(/^約\d+m進む。/);

    rerender(
      <RouteScreen
        graph={graph}
        fromNodeId="wt-izumi"
        toNodeId="ex-C-93"
        destinationLabel={null}
        aboveGround={false}
        avoidStairs={false}
        onToggleAvoidStairs={() => {}}
        onLost={() => {}}
        onFinish={() => {}}
        onClose={() => {}}
        stepIndex={1}
        onStepChange={() => {}}
      />,
    );
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect((synth.speak.mock.calls[1][0] as FakeUtterance).text).not.toBe(first.text);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('hides the voice button when the browser cannot speak', () => {
    renderRoute();
    expect(screen.queryByRole('button', { name: '音声案内' })).not.toBeInTheDocument();
  });
});
