/**
 * FACES부터 global controller인 Digital Crown은 두 곳에서 모습이 정해진다.
 *   useScrollScene   About -> FACES : Watch에서 떨어지며 옆모습 -> 정면
 *   useContactScene  Contact        : 다시 Watch에 결합하며 정면 -> 옆모습
 *
 * 같은 element(옆모습 / 정면)를 두 scroll 구간이 따로 tween하면, 두 구간을 한 번에 건너뛰는 scroll에서
 * 나중에 갱신된 쪽이 앞쪽 상태를 덮어쓴다. 그래서 방향은 두 진행률을 함께 보는 함수 하나가 그린다.
 */
export const crownLink = {
  /** Contact에서 Watch에 결합한 정도. 0 = FACES 이후 controller, 1 = Contact Watch에 결합. */
  attach: 0,
  /** 현재 값으로 Crown 방향과 controller 상태를 다시 그린다. useScrollScene이 채운다. */
  refresh: () => {},
}
