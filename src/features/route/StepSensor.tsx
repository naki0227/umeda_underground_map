import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STRIDE_M } from './stepDetector';
import { motionSupported, requestMotionPermission, useStepCounter } from './useStepCounter';

interface Props {
  /** いまのステップ（変わったら数え直す） */
  stepKey: number;
  /** いまの区間の長さ（m） */
  distanceM: number;
  /** 次のステップがあるか */
  hasNext: boolean;
}

/**
 * 歩数で進み具合を見る（動きのセンサー。使う人だけ）。区間の 8 割ほど歩いたら次の案内を見るよう
 * 知らせる（Jackermeier & Ludwig 2018: 地図から向きを取り、目印で位置を直すと精度が大きく上がる）。
 * 自動では進めない。センサーがない・許可されないときは「次へ」で進めばよい
 */
export function StepSensor({ stepKey, distanceM, hasNext }: Props) {
  const { t } = useTranslation();
  const [sensor, setSensor] = useState<'off' | 'on' | 'denied'>('off');
  const { steps, reset } = useStepCounter(sensor === 'on');
  useEffect(() => reset(), [stepKey, reset]);
  if (!motionSupported()) return null;

  const walkedM = steps * STRIDE_M;
  const nearlyThere = sensor === 'on' && hasNext && walkedM >= distanceM * 0.8;
  const toggle = async () => {
    if (sensor === 'on') {
      setSensor('off');
      return;
    }
    setSensor((await requestMotionPermission()) ? 'on' : 'denied');
  };

  return (
    <div className="step-sensor" data-testid="step-sensor">
      {sensor === 'on' && (
        <p className={nearlyThere ? 'hint ok' : 'hint'} role="status">
          {nearlyThere
            ? t('route.sensorNearly')
            : t('route.sensorWalked', {
                walked: Math.round(walkedM),
                total: Math.round(distanceM),
              })}
        </p>
      )}
      {sensor === 'denied' && <p className="hint">{t('route.sensorDenied')}</p>}
      <button type="button" className="link-button" onClick={() => void toggle()}>
        {sensor === 'on' ? t('route.sensorOff') : t('route.sensorOn')}
      </button>
    </div>
  );
}
