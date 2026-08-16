import { useEffect, useRef, useState } from 'react'
import { jobs, site, work } from './content'

const tabs = [
  { id: 'about', label: 'About' },
  { id: 'work-exp', label: 'Experience' },
  { id: 'work', label: 'Work' },
  { id: 'resume', label: 'Resume' },
  { id: 'hello', label: 'Hello' },
]

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function liveSrc() {
  if (typeof window === 'undefined') return site.live
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8000/'
  return site.live
}

const STEP_MS = 900
const D = { d3: 146.83, a3: 220, d4: 293.66, e4: 329.63, f4: 349.23, a4: 440, bb4: 466.16, d5: 587.33 }
// Hirajoshi on D — the interval that reads as "samurai" rather than generic minor.
// [frequency, length in steps]; nulls are the breathing room a shakuhachi line needs.
const MELODY = [
  [D.d4, 3], null, null, [D.f4, 2], null, [D.e4, 3], null, null,
  null, [D.a4, 4], null, null, null, [D.f4, 2], null, [D.e4, 2],
  null, [D.d4, 3], null, null, [D.a3, 4], null, null, null,
  [D.bb4, 3], null, null, [D.a4, 2], null, [D.f4, 4], null, null,
]

function noiseBuffer(audio, seconds) {
  const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buf
}

// One long-lived graph per page. Mute rides the master gain instead of tearing
// nodes down, so a second copy of the track can never end up orphaned.
function createTheme(audio) {
  const master = audio.createGain()
  master.gain.value = 0
  master.connect(audio.destination)

  // Instruments run through a bus so one delay gives the whole thing room tone.
  const bus = audio.createGain()
  bus.connect(master)
  const delay = audio.createDelay(1)
  delay.delayTime.value = 0.34
  const feedback = audio.createGain()
  feedback.gain.value = 0.34
  const wet = audio.createGain()
  wet.gain.value = 0.32
  bus.connect(delay)
  delay.connect(feedback).connect(delay)
  delay.connect(wet).connect(master)

  const pad = audio.createGain()
  pad.gain.value = 0.09
  const padFilter = audio.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 520
  pad.connect(padFilter).connect(master)
  ;[73.42, 110, 146.83].forEach((hz, i) => {
    const o = audio.createOscillator()
    o.type = i === 2 ? 'triangle' : 'sine'
    o.frequency.value = hz
    o.connect(pad)
    o.start()
  })
  const swell = audio.createOscillator()
  const swellDepth = audio.createGain()
  swell.frequency.value = 0.06
  swellDepth.gain.value = 180
  swell.connect(swellDepth).connect(padFilter.frequency)
  swell.start()

  const hiss = audio.createBufferSource()
  hiss.buffer = noiseBuffer(audio, 2)
  hiss.loop = true
  const hissFilter = audio.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 1100
  const hissGain = audio.createGain()
  hissGain.gain.value = 0.035
  hiss.connect(hissFilter).connect(hissGain).connect(master)
  hiss.start()

  // Shakuhachi: a near-pure tone that gets its character from breath noise on
  // top, a slow attack, and the pitch scooping up into the note.
  const flute = (hz, at, seconds) => {
    const voice = audio.createGain()
    const tone = audio.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = hz * 5
    voice.connect(tone).connect(bus)

    const body = audio.createOscillator()
    body.type = 'sine'
    body.frequency.setValueAtTime(hz * 0.972, at)
    body.frequency.exponentialRampToValueAtTime(hz, at + 0.16)

    const vibrato = audio.createOscillator()
    const vibratoDepth = audio.createGain()
    vibrato.frequency.value = 5.1
    vibratoDepth.gain.setValueAtTime(0, at)
    vibratoDepth.gain.linearRampToValueAtTime(hz * 0.011, at + seconds * 0.55)
    vibrato.connect(vibratoDepth).connect(body.frequency)

    const air = audio.createOscillator()
    air.type = 'triangle'
    air.frequency.value = hz * 2
    const airGain = audio.createGain()
    airGain.gain.value = 0.08
    air.connect(airGain).connect(voice)

    const breath = audio.createBufferSource()
    breath.buffer = noiseBuffer(audio, Math.max(seconds, 0.5))
    const breathFilter = audio.createBiquadFilter()
    breathFilter.type = 'bandpass'
    breathFilter.frequency.value = hz * 2.4
    breathFilter.Q.value = 1.4
    const breathGain = audio.createGain()
    breathGain.gain.setValueAtTime(0.0001, at)
    breathGain.gain.linearRampToValueAtTime(0.09, at + 0.1)
    breathGain.gain.linearRampToValueAtTime(0.02, at + seconds * 0.6)
    breath.connect(breathFilter).connect(breathGain).connect(voice)

    body.connect(voice)
    voice.gain.setValueAtTime(0.0001, at)
    voice.gain.linearRampToValueAtTime(0.34, at + 0.19)
    voice.gain.linearRampToValueAtTime(0.26, at + seconds * 0.7)
    voice.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

    const end = at + seconds + 0.1
    ;[body, vibrato, air, breath].forEach((node) => {
      node.start(at)
      node.stop(end)
    })
  }

  // A single soft tom under the top of each phrase — presence, not a beat.
  const tom = (at) => {
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(104, at)
    o.frequency.exponentialRampToValueAtTime(52, at + 0.28)
    g.gain.setValueAtTime(0.3, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
    o.connect(g).connect(master)
    o.start(at)
    o.stop(at + 0.62)
  }

  let step = 0
  let timer = null
  const play = () => {
    const at = audio.currentTime + 0.05
    const note = MELODY[step % MELODY.length]
    if (note) flute(note[0], at, (note[1] * STEP_MS) / 1000)
    if (step % MELODY.length === 0) tom(at)
    step += 1
  }

  return {
    start() {
      if (timer) return
      const now = audio.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0.24, now + 2.2)
      play()
      timer = window.setInterval(play, STEP_MS)
    },
    stop() {
      if (timer) {
        window.clearInterval(timer)
        timer = null
      }
      const now = audio.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0.0001, now + 0.5)
    },
    blip() {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      g.gain.setValueAtTime(0.1, audio.currentTime)
      o.connect(g).connect(master)
      o.start()
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12)
      o.stop(audio.currentTime + 0.14)
    },
  }
}

function useAudio(muted) {
  const themeRef = useRef(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const theme = () => {
    if (!themeRef.current) {
      const audio = new AudioContext()
      themeRef.current = { audio, engine: createTheme(audio) }
    }
    return themeRef.current
  }

  useEffect(() => {
    if (muted) {
      themeRef.current?.engine.stop()
      return undefined
    }
    // Browsers hold the context suspended until the visitor interacts, so the
    // default-on track waits for the first click/scroll/keypress.
    const { audio, engine } = theme()
    const begin = () => {
      audio.resume().then(() => {
        if (!mutedRef.current) engine.start()
      })
    }
    begin()
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach((type) => window.addEventListener(type, begin, { passive: true }))
    return () => {
      events.forEach((type) => window.removeEventListener(type, begin))
      engine.stop()
    }
  }, [muted])

  const tick = () => {
    if (muted) return
    theme().engine.blip()
  }
  return { tick }
}

function Petals({ pointer }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    let id
    const petals = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      s: 0.45 + Math.random() * 0.8,
      r: Math.random() * Math.PI,
      v: 0.00035 + Math.random() * 0.00055,
    }))
    const fit = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      const px = pointer.current.x
      const py = pointer.current.y
      petals.forEach((p) => {
        const dx = p.x - px
        const dy = p.y - py
        const d2 = dx * dx + dy * dy
        if (d2 < 0.01 && d2 > 0.00002) {
          const d = Math.sqrt(d2)
          p.vx += (dx / d) * 0.0015
          p.vy += (dy / d) * 0.0015
        }
        p.vx *= 0.96
        p.vy *= 0.96
        p.x += p.vx
        p.y += p.vy + p.v
        p.r += 0.01
        if (p.y > 1.08) {
          p.y = -0.04
          p.x = Math.random()
        }
        ctx.save()
        ctx.translate(p.x * w, p.y * h)
        ctx.rotate(p.r)
        ctx.fillStyle = 'rgba(255, 186, 196, 0.55)'
        ctx.beginPath()
        ctx.ellipse(0, 0, 5.5 * p.s, 10 * p.s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      id = requestAnimationFrame(draw)
    }
    fit()
    draw()
    window.addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', fit)
    }
  }, [pointer])
  return <canvas ref={ref} className="petals" aria-hidden="true" />
}

function Magnetic({ href, className, children, onEnter }) {
  const ref = useRef(null)
  return (
    <a
      ref={ref}
      href={href}
      className={className}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      onMouseEnter={onEnter}
      onMouseMove={(e) => {
        const b = ref.current.getBoundingClientRect()
        ref.current.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * 0.22}px, ${(e.clientY - b.top - b.height / 2) * 0.26}px)`
      }}
      onMouseLeave={() => {
        ref.current.style.transform = 'translate(0,0)'
      }}
    >
      {children}
    </a>
  )
}

function CountUp({ to, suffix, play, reduced }) {
  const [n, setN] = useState(reduced ? to : 0)
  useEffect(() => {
    if (!play) return undefined
    if (reduced) {
      setN(to)
      return undefined
    }
    const start = performance.now()
    let id
    const step = (t) => {
      const p = Math.min(1, (t - start) / 900)
      const eased = 1 - (1 - p) ** 3
      setN(Math.round(to * eased))
      if (p < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [play, reduced, to])
  return (
    <span className="punch">
      {to >= 1000 ? n.toLocaleString() : n}
      {suffix}
    </span>
  )
}

function LiveFloor({ src }) {
  return (
    <div className="floor">
      <div className="floor-bar">
        <p>Grid Runner · live</p>
        <div>
          <a href={src} target="_blank" rel="noreferrer">
            Open full →
          </a>
          <a href="https://github.com/Dipxk/grid-runner" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
      <iframe title="Grid Runner live warehouse" src={src} />
    </div>
  )
}

function Card({ item, onEnter }) {
  const ref = useRef(null)
  const inner = (
    <>
      <div>
        <div className="kind">{item.kind}</div>
        <h3>{item.title}</h3>
        <p>{item.copy}</p>
      </div>
      <span className="go">{item.live ? 'Open live →' : item.href ? 'GitHub →' : 'Studio'}</span>
    </>
  )
  const move = (e) => {
    const b = ref.current.getBoundingClientRect()
    const px = (e.clientX - b.left) / b.width
    const py = (e.clientY - b.top) / b.height
    ref.current.style.transform = `perspective(900px) rotateX(${(py - 0.5) * -10}deg) rotateY(${(px - 0.5) * 12}deg)`
  }
  const href = item.live || item.href
  const props = {
    ref,
    className: 'card reveal',
    onMouseMove: move,
    onMouseLeave: () => {
      ref.current.style.transform = 'none'
    },
    onMouseEnter: onEnter,
  }
  if (!href) return <article {...props}>{inner}</article>
  return (
    <a {...props} href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  )
}

export default function App() {
  const reduced = reducedMotion()
  const [muted, setMuted] = useState(reducedMotion())
  const [playJobs, setPlayJobs] = useState(reduced)
  const [tab, setTab] = useState('')
  const demo = liveSrc()
  const { tick } = useAudio(muted)
  const pointer = useRef({ x: 0.5, y: 0.4 })
  const stageRef = useRef(null)
  const jobsRef = useRef(null)

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (reduced) {
      els.forEach((el) => el.classList.add('in'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in')
        })
      },
      { threshold: 0.16 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [reduced])

  useEffect(() => {
    const ids = tabs.map((t) => t.id)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setTab(visible.target.id)
      },
      { rootMargin: '-28% 0px -58% 0px', threshold: [0.15, 0.35, 0.6] },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = jobsRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setPlayJobs(true)
      },
      { threshold: 0.18 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    let id
    const loop = () => {
      const stage = stageRef.current
      if (stage && pointer.current.lx != null) {
        pointer.current.ex ??= pointer.current.lx
        pointer.current.ey ??= pointer.current.ly
        pointer.current.ex += (pointer.current.lx - pointer.current.ex) * 0.1
        pointer.current.ey += (pointer.current.ly - pointer.current.ey) * 0.1
        stage.style.setProperty('--lx', `${pointer.current.ex.toFixed(2)}%`)
        stage.style.setProperty('--ly', `${pointer.current.ey.toFixed(2)}%`)
      }
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])

  const lamp = (cx, cy) => {
    const stage = stageRef.current
    if (!stage) return
    const box = stage.getBoundingClientRect()
    const nx = (cx - box.left) / box.width
    const ny = (cy - box.top) / box.height
    pointer.current.x = nx
    pointer.current.y = ny
    pointer.current.lx = nx * 100
    pointer.current.ly = ny * 100
    stage.style.setProperty('--px', (nx - 0.5).toFixed(3))
    stage.style.setProperty('--py', (ny - 0.5).toFixed(3))
  }

  return (
    <div className="world">
      <div className="grain" />
      <header className="hud">
        <a className="brand" href="#top">
          DK
        </a>
        <nav>
          {tabs.map((item) => (
            <a key={item.id} href={`#${item.id}`} className={tab === item.id ? 'on' : ''}>
              {item.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className={muted ? '' : 'playing'}
          aria-pressed={!muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </header>

      <section
        className="stage"
        id="top"
        ref={stageRef}
        onPointerMove={(e) => lamp(e.clientX, e.clientY)}
      >
        <div className="sky" />
        <div className="stars" />
        <div className="horizon" />
        <div className="skyline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="lamp" />
        {!reduced && <Petals pointer={pointer} />}
        <div className="copy">
          <p className="mark">
            <span className="jp">ようこそ</span> DK
          </p>
          <h1>
            Dipak
            <br />
            Kumar
          </h1>
          <p className="meta">{site.place}</p>
          <p className="meta dim">{site.line}</p>
          <p className="now">{site.now}</p>
          <div className="row">
            <Magnetic href={demo} className="cta" onEnter={tick}>
              Watch the live demo
            </Magnetic>
            <Magnetic href="#resume" className="cta ghost" onEnter={tick}>
              Resume
            </Magnetic>
          </div>
        </div>
      </section>

      <section className="sheet about" id="about">
        <div className="chapter-copy reveal">
          <p className="eyebrow">About · 私について</p>
          <h2>What I work on.</h2>
          <p>{site.about}</p>
          <ul className="skills">
            {site.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sheet jobs-chapter" id="work-exp" ref={jobsRef}>
        <div className="jobs-wrap">
          <div className="reveal">
            <p className="eyebrow">Experience · 経験</p>
            <h2>What I actually did.</h2>
          </div>
          <div className="jobs">
            {jobs.map((job) => (
              <article key={job.org} className="job reveal">
                <div className="job-top">
                  <div>
                    <p className="job-meta">
                      {job.role} · {job.when}
                    </p>
                    <h3>{job.org}</h3>
                  </div>
                  <div className="job-hit">
                    <CountUp to={job.punch} suffix={job.suffix} play={playJobs} reduced={reduced} />
                    <p className="punch-label">{job.label}</p>
                  </div>
                </div>
                <ul>
                  {job.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sheet" id="work">
        <div className="reveal">
          <p className="eyebrow">Selected work · 作品</p>
          <h2>Things you can open.</h2>
        </div>
        <div className="cards">
          {work.map((item) => (
            <Card
              key={item.title}
              item={item.live ? { ...item, live: demo } : item}
              onEnter={tick}
            />
          ))}
        </div>
        <LiveFloor src={demo} />
      </section>

      <section className="sheet" id="resume">
        <div className="reveal">
          <p className="eyebrow">Resume · 履歴書</p>
          <h2>The one-pager.</h2>
          <a className="cta ghost resume-dl" href={site.resume} download>
            Download PDF
          </a>
        </div>
        <embed className="resume-frame" src={site.resume} type="application/pdf" />
      </section>

      <section className="sheet hello-block reveal" id="hello">
        <p className="eyebrow">Hello · 連絡</p>
        <h2>Made in Ottawa.</h2>
        <div className="hello">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <a href={site.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={site.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
        </div>
      </section>
    </div>
  )
}
