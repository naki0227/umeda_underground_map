import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import App from './App';
import { initI18n } from './i18n';

beforeAll(() => {
  const i18n = initI18n('ja');
  return i18n.changeLanguage('ja');
});

// 画面をまたぐ長いフロー（検索・位置確定・案内）を通すので、遅い CI でも足りる時間にする
describe('App map-first user flow', { timeout: 15_000 }, () => {
  it('searches a place, sets location via shops, and shows directions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. 全画面マップと検索バーが出る
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: '目的地を入力（お店・出口・スポット）' });

    // 2. 検索して地上スポットを選ぶ
    await user.type(search, 'HEP');
    const results = screen.getByRole('list', { name: '検索結果' });
    await user.click(within(results).getByRole('button', { name: /HEP FIVE（赤い観覧車）/ }));

    // 3. 場所シート → ここへ行く（現在地未設定なので位置確定シートへ）
    await user.click(screen.getByRole('button', { name: 'ここへ行く' }));
    expect(screen.getByRole('dialog', { name: '現在地を確認する' })).toBeInTheDocument();

    // 4. 近くの店を2つ選んで推定 → 推定位置カードから案内開始
    const locateSheet = screen.getByRole('dialog', { name: '現在地を確認する' });
    // 方法は「出口の番号」が開いている。「見えるお店」に切り替える
    expect(within(locateSheet).getByRole('radio', { name: '出口の番号' })).toBeChecked();
    await user.click(within(locateSheet).getByRole('radio', { name: '見えるお店' }));
    const shopSearch = within(locateSheet).getByPlaceholderText('店名で検索');
    await user.type(shopSearch, 'スターバックス');
    await user.click(
      within(locateSheet).getByLabelText(/スターバックスコーヒー ホワイティうめだ店/),
    );
    await user.clear(shopSearch);
    await user.type(shopSearch, '古潭');
    await user.click(within(locateSheet).getByLabelText(/古潭 ホワイティうめだ店/));
    // 選んだ店は検索を変えても残る
    expect(
      within(locateSheet).getByLabelText(/スターバックスコーヒー ホワイティうめだ店/),
    ).toBeChecked();
    await user.click(screen.getByRole('button', { name: '現在地を推定する' }));
    expect(screen.getByText('推定位置')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'この位置で案内開始' }));

    // 5. 経路シートが表示される（地上ヒント・迷ったボタン付き）
    expect(screen.getByRole('dialog', { name: '道案内' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /HEP FIVE（赤い観覧車）まで/ })).toBeInTheDocument();
    expect(screen.getByText(/から地上へ/)).toBeInTheDocument();
    expect(screen.getByText(/到着まで 約\d+分・\d+m/)).toBeInTheDocument();
    expect(screen.getByTestId('next-step')).toBeInTheDocument();
    expect(screen.getAllByTestId('map-route').length).toBeGreaterThan(0);

    // 5b. 案内が始まると一人称の画面に切り替わる（地図は隠れ、通路の絵と左上の小さな地図）
    const fpv = screen.getByTestId('first-person');
    expect(fpv.querySelectorAll('.fpv-scene polygon').length).toBeGreaterThan(20);
    expect(screen.getByRole('region', { name: '左' })).toBeInTheDocument();
    expect(document.querySelector('.app-map')).toHaveClass('fpv-on');
    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.querySelector('.mini-map-step')).not.toBeNull();
    // 小さな地図を押すと全体の地図に戻り、「一人称で見る」で一人称の画面に戻る
    await user.click(miniMap);
    expect(screen.queryByTestId('first-person')).not.toBeInTheDocument();
    expect(document.querySelector('.app-map')).not.toHaveClass('fpv-on');
    await user.click(screen.getByRole('button', { name: '一人称で見る' }));
    expect(screen.getByTestId('first-person')).toBeInTheDocument();

    // 6. 経路シートを閉じても案内は続き、バナーから再表示できる
    await user.click(
      within(screen.getByRole('dialog', { name: '道案内' })).getByRole('button', {
        name: '閉じる',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '道案内を表示する' }));
    expect(screen.getByRole('dialog', { name: '道案内' })).toBeInTheDocument();

    // 7. 迷ったボタンで位置確定シートに戻り、再測位の説明が出る
    await user.click(screen.getByRole('button', { name: '迷った' }));
    expect(screen.getByRole('dialog', { name: '現在地を確認する' })).toBeInTheDocument();
    expect(screen.getByText(/現在地をもう一度確認します/)).toBeInTheDocument();
  });

  it('selects a map pin with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const pin = container.querySelector('[data-node-id="wt-izumi"]') as HTMLElement;
    pin.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: /泉の広場/ })).toBeInTheDocument();
  });

  it('keeps the chosen above-ground spot in the entrance list even if it shares an exit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '現在地を設定すると道案内できます' }));
    await user.click(screen.getByRole('radio', { name: '見えるお店' }));
    await user.click(screen.getByText('ほかの手がかり（入った場所・GPS）'));
    const select = screen.getByRole('combobox', { name: /どこから地下に入りましたか/ });
    // 大丸とルクアは同じ出口に対応するが、選んだ方が表示される
    await user.selectOptions(select, '大丸梅田店');
    expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe('大丸梅田店');
  });

  it('selects a pin on the map and sets it as current location', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const pin = container.querySelector('[data-node-id="wt-izumi"]');
    expect(pin).not.toBeNull();
    await user.click(pin as Element);
    expect(screen.getByRole('dialog', { name: /泉の広場/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'いまここにいる' }));
    // 現在地マーカーがマップに出る
    expect(screen.getByTestId('map-current')).toBeInTheDocument();
  });

  it('opens spots and menu from the tab bar', async () => {
    const user = userEvent.setup();
    render(<App />);

    // スポットタブ → おすすめスポットのカード一覧
    await user.click(screen.getByRole('button', { name: 'スポット' }));
    const spots = screen.getByRole('dialog', { name: 'スポット' });
    expect(within(spots).getByRole('button', { name: /HEP FIVE/ })).toBeInTheDocument();

    // メニュータブ → 報告リンクと言語切替
    await user.click(screen.getByRole('button', { name: 'メニュー' }));
    const link = screen.getByRole('link', { name: /間違いを報告する/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('docs.google.com/forms'));

    // 地図タブでシートが閉じる
    await user.click(screen.getByRole('button', { name: '地図' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('steps through directions and the map follows the current step', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // 泉の広場を現在地に、ドーチカ南方面のお店を目的地に
    await user.click(container.querySelector('[data-node-id="wt-izumi"]') as Element);
    await user.click(screen.getByRole('button', { name: 'いまここにいる' }));
    const search = screen.getByRole('searchbox', { name: '目的地を入力（お店・出口・スポット）' });
    await user.type(search, 'C-93');
    await user.click(
      within(screen.getByRole('list', { name: '検索結果' })).getAllByRole('button')[0],
    );
    await user.click(screen.getByRole('button', { name: 'ここへ行く' }));

    const card = screen.getByTestId('next-step');
    expect(card).toHaveTextContent(/^1 \/ \d+/);
    expect(screen.getByTestId('map-route-focus')).toBeInTheDocument();
    // 泉の広場から西へ向かう区間沿いの店名が地図に出る
    expect(screen.getAllByTestId('map-shop-label').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled();
    const firstAction = card.textContent;

    await user.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByTestId('next-step')).toHaveTextContent(/^2 \/ \d+/);
    expect(screen.getByTestId('next-step').textContent).not.toBe(firstAction);
    expect(screen.getByRole('button', { name: '前へ' })).toBeEnabled();
    // 1ステップ目は完了扱いで、2ステップ目が現在
    const stepItems = container.querySelectorAll('ol.steps li');
    expect(stepItems[0]).toHaveClass('done');
    expect(stepItems[1]).toHaveAttribute('aria-current', 'step');
  });

  it.each([
    ['桜橋口', 'JR大阪駅 桜橋口'],
    ['御堂筋口', 'JR大阪駅 御堂筋口'],
  ])('choosing 大阪駅 guides to its nearest gate (from %s)', async (from, gate) => {
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByRole('searchbox', { name: '目的地を入力（お店・出口・スポット）' });
    const results = () => within(screen.getByRole('list', { name: '検索結果' }));

    // 現在地をその改札に
    await user.type(search, from);
    await user.click(results().getByRole('button', { name: new RegExp(from) }));
    await user.click(screen.getByRole('button', { name: 'いまここにいる' }));

    // 「大阪駅」で駅が先頭に出て、選ぶと近い方の改札へ案内する
    await user.type(search, '大阪駅');
    const first = results().getAllByRole('button')[0];
    expect(first).toHaveTextContent('JR大阪駅');
    expect(first).toHaveTextContent('駅');
    await user.click(first);
    await user.click(screen.getByRole('button', { name: 'ここへ行く' }));
    expect(screen.getByRole('heading', { name: `${gate}まで` })).toBeInTheDocument();
  });

  it('adds a place to favorites and starts directions from the favorites tab', async () => {
    localStorage.clear();
    const tabs = () => screen.getByRole('navigation', { name: 'メインメニュー' });
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(within(tabs()).getByRole('button', { name: 'お気に入り' }));
    expect(screen.getByText(/まだありません/)).toBeInTheDocument();

    await user.click(container.querySelector('[data-node-id="wt-izumi"]') as Element);
    const favButton = within(screen.getByRole('dialog', { name: /泉の広場/ })).getByRole('button', {
      name: 'お気に入り',
    });
    await user.click(favButton);
    expect(favButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(tabs()).getByRole('button', { name: 'お気に入り' }));
    const sheet = screen.getByRole('dialog', { name: 'お気に入り' });
    await user.click(within(sheet).getByRole('button', { name: '泉の広場（Water Tree）' }));
    expect(screen.getByRole('dialog', { name: /泉の広場/ })).toBeInTheDocument();

    // 外すと一覧から消える
    await user.click(within(tabs()).getByRole('button', { name: 'お気に入り' }));
    await user.click(screen.getByRole('button', { name: /をお気に入りから外す/ }));
    expect(screen.getByText(/まだありません/)).toBeInTheDocument();
  });
});
