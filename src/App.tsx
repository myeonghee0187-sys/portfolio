import { useCallback, useState } from 'react'
import IntroVideo from './components/IntroVideo'
import Header from './components/Header'
import Hero from './components/Hero'

export default function App() {
  const [isIntroDone, setIsIntroDone] = useState(false)

  const handleIntroFinish = useCallback(() => setIsIntroDone(true), [])

  return (
    <>
      {/*
        Header/Hero는 Intro 아래에 항상 마운트되어 있다.
        Intro가 불투명한 fixed overlay라 재생 중에는 가려져 보이지 않고,
        fade-out이 진행되면서 그대로 드러난다.
      */}
      {!isIntroDone && <IntroVideo onFinish={handleIntroFinish} />}
      <div className="site">
        <Header />
        <main>
          <Hero />
        </main>
      </div>
    </>
  )
}
