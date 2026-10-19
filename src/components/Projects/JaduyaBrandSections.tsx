import './JaduyaBrandSections.css'

const BRAND_ASSET_ROOT = '/projects/jaduya/brand'

export function JaduyaBrandConcept() {
  return (
    <section className="jaduya-brand-concept" aria-labelledby="jaduya-brand-concept-title">
      <img
        className="jaduya-brand-concept__plum"
        src={`${BRAND_ASSET_ROOT}/ripe-plum-outline.png`}
        width="545"
        height="545"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />

      <div className="jaduya-brand-concept__heading">
        <p>BRAND CONCEPT</p>
        <h2 id="jaduya-brand-concept-title">혼자여두 괜찮아, 자두야!</h2>
      </div>

      <img
        className="jaduya-brand-concept__mascot"
        src={`${BRAND_ASSET_ROOT}/jaduya-mascot.png`}
        width="1254"
        height="1254"
        alt="집을 품에 안고 있는 자두야 캐릭터"
        loading="lazy"
      />

      <div className="jaduya-brand-concept__card jaduya-brand-concept__card--origin">
        <p>‘자취'와 ‘두더지'가 만나</p>
        <p>자두야가 탄생했어요.</p>
      </div>

      <div className="jaduya-brand-concept__card jaduya-brand-concept__card--path">
        <p>두더지가 땅속에 길을 내듯,</p>
        <p>자취 생활에도 길을 열어요!</p>
      </div>

      <div className="jaduya-brand-concept__card jaduya-brand-concept__card--support">
        <p>혼자여도 든든한 일상,</p>
        <p>언제나 곁에서 함께해요.</p>
      </div>
    </section>
  )
}

export function JaduyaEnding() {
  return (
    <section className="jaduya-ending" aria-label="자두야 프로젝트 결론">
      <div className="jaduya-ending__road-stage" aria-hidden="true">
        <div className="jaduya-ending__road-rotation">
          <div className="jaduya-ending__road-frame">
            <img
              src={`${BRAND_ASSET_ROOT}/ending-road.png`}
              width="1448"
              height="1086"
              alt=""
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <div className="jaduya-ending__mascot-stage">
        <div className="jaduya-ending__mascot-rotation">
          <div className="jaduya-ending__mascot-frame">
            <img
              src={`${BRAND_ASSET_ROOT}/walking-mascot.png`}
              width="1448"
              height="1086"
              alt="지도를 들고 길을 찾는 자두야 캐릭터"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <p className="jaduya-ending__copy">
        <span>혼자 사는 일상의 고민을 덜고,</span>{' '}
        <span>판단부터 해결까지 길을 열어주는</span>{' '}
        <span>자취생활 경험을 완성했습니다.</span>
      </p>
    </section>
  )
}
