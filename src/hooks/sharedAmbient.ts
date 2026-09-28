/**
 * About -> FACES가 같이 쓰는 Watch 뒤 Ice Ambient의 세기.
 *
 * About의 .about__ambient(CSS gradient)와 FACES canvas의 빈 바탕(facesScene의 ambientGlow)이
 * 같은 gradient를 같은 세기로 그린다. 값은 About 카드 / About -> FACES timeline(useScrollScene)만 쓰고,
 * FACES 그리기 루프는 매 프레임 읽기만 한다 — scroll listener를 따로 두지 않는다.
 *
 * level = .about__ambient의 opacity. About에서 0.9 ~ 1, About -> FACES 동안 0.3까지 가라앉는다.
 *
 * ice / iceScale = About -> FACES 경계 Ice Reflection의 opacity와 scale.
 * About.css .about-faces-transition-light와 FACES canvas(handoffLight)가 같은 값으로 그린다.
 */
export const sharedAmbient = { level: 0, ice: 0, iceScale: 0.82 }
