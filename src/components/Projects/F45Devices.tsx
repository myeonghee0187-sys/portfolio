import { useId, useLayoutEffect, useRef, useState } from 'react'
import { DEVICE_CONTENT, DEVICE_FRAME, DEVICE_SCREENS, screenProjection } from './deviceScreenProjection'
import './F45Devices.css'

const point = (x: number, y: number) => `${x / DEVICE_FRAME.width} ${y / DEVICE_FRAME.height}`

// Preserve the original product-frame overlap so its bezels and foreground devices occlude each screen.
const foregroundOutline = `M${point(1370, 361)} L${point(1616, 358)} Q${point(1638, 357)} ${point(1638, 378)} L${point(1638, 776)} Q${point(1638, 798)} ${point(1617, 798)} L${point(1396, 795)} Q${point(1396, 814)} ${point(1374, 813)} L${point(1265, 810)} Q${point(1245, 810)} ${point(1245, 788)} L${point(1245, 515)} Q${point(1245, 493)} ${point(1267, 493)} L${point(1348, 493)} L${point(1348, 381)} Q${point(1348, 362)} ${point(1370, 361)} Z`
const phoneOutline = `M${point(1267, 493)} L${point(1374, 492)} Q${point(1396, 492)} ${point(1396, 515)} L${point(1396, 791)} Q${point(1396, 814)} ${point(1374, 813)} L${point(1265, 810)} Q${point(1245, 810)} ${point(1245, 788)} L${point(1245, 515)} Q${point(1245, 493)} ${point(1267, 493)} Z`
const desktopDisplay = `M${point(691, 149)} L${point(1452, 120)} L${point(1453, 617)} L${point(691, 605)} Z`
const tabletDisplay = `M${point(1375, 375)} L${point(1609, 373)} Q${point(1620, 373)} ${point(1620, 384)} L${point(1620, 769)} Q${point(1620, 780)} ${point(1609, 780)} L${point(1375, 774)} Q${point(1364, 774)} ${point(1364, 763)} L${point(1364, 386)} Q${point(1364, 375)} ${point(1375, 375)} Z`
const phoneDisplay = `M${point(1265, 500)} L${point(1284, 500)} L${point(1285, 505)} Q${point(1286, 510)} ${point(1292, 510)} L${point(1347, 510)} Q${point(1354, 510)} ${point(1354, 504)} L${point(1354, 499)} L${point(1374, 499)} Q${point(1385, 499)} ${point(1385, 511)} L${point(1385, 790)} Q${point(1385, 802)} ${point(1373, 802)} L${point(1266, 800)} Q${point(1254, 800)} ${point(1254, 788)} L${point(1254, 512)} Q${point(1254, 500)} ${point(1265, 500)} Z`
const homeIndicator = `M${point(1295, 794)} L${point(1345, 794)} Q${point(1347, 794)} ${point(1347, 796)} Q${point(1347, 798)} ${point(1345, 798)} L${point(1295, 798)} Q${point(1293, 798)} ${point(1293, 796)} Q${point(1293, 794)} ${point(1295, 794)} Z`
const masks = [desktopDisplay + foregroundOutline, tabletDisplay + phoneOutline, phoneDisplay + homeIndicator]

type Props = { className: string; decorative?: boolean; fit?: boolean }

export default function F45Devices({ className, decorative = false, fit = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const id = useId().replaceAll(':', '')

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`f45-devices ${className}`} role={decorative ? undefined : 'img'}
      style={fit ? { aspectRatio: `${DEVICE_CONTENT.width} / ${DEVICE_CONTENT.height}` } : undefined}
      aria-label={decorative ? undefined : 'F45 Korea website shown on desktop, tablet, and mobile devices'}
      aria-hidden={decorative || undefined}>
      <div ref={ref} className="f45-devices__composition" style={fit ? {
        position: 'absolute', width: `${DEVICE_FRAME.width / DEVICE_CONTENT.width * 100}%`,
        left: `${-DEVICE_CONTENT.x / DEVICE_CONTENT.width * 100}%`,
        top: `${-DEVICE_CONTENT.y / DEVICE_CONTENT.height * 100}%`,
      } : undefined}>
        <img className="f45-devices__frame" src="/projects/f45/devices-frame.png" width={1672} height={941} alt="" />
        <svg className="f45-devices__masks" aria-hidden="true">
          <defs>{masks.map((path, index) => (
            <clipPath key={index} id={`${id}-${index}`} clipPathUnits="objectBoundingBox">
              <path d={path} clipRule="evenodd" />
            </clipPath>
          ))}</defs>
        </svg>
        {DEVICE_SCREENS.map((screen, index) => (
          <div key={screen.id} className="f45-devices__layer" style={{ clipPath: `url(#${id}-${index})` }}>
            <img className="f45-devices__capture" src={`/projects/f45/screen-${screen.id}.webp`} alt=""
              loading={decorative ? 'lazy' : 'eager'} width={screen.width * 2} height={screen.height * 2}
              style={{ width: screen.width, height: screen.height, visibility: width ? 'visible' : 'hidden',
                transform: `matrix3d(${screenProjection(screen.quad, screen.width, screen.height, width / DEVICE_FRAME.width).join(',')})` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
