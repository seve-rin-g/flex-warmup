import React, { useEffect, useRef, useState } from 'react'

function parseInput(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const activities = []
  for (const line of lines) {
    let m = line.match(/^(.*?)\s*[-:]\s*(\d+)\s*$/)
    if (!m) m = line.match(/^(.*?)(?:\s+)?(\d+)\s*$/)
    if (m) {
      const name = m[1].trim()
      const duration = parseInt(m[2], 10)
      if (name && duration > 0) activities.push({ name, duration })
    } else {
      const m2 = line.match(/^(.*?)\D+(\d+)\s*$/)
      if (m2) activities.push({ name: m2[1].trim(), duration: parseInt(m2[2], 10) })
    }
  }
  return activities
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const [text, setText] = useState(
    `
    Hands to toes - 30\n
    Toes to hands - 30\n
    Rest - 10\n
    Superman - 30\n
    Tricep push-ups - 45\n
    Rest - 10\n
    V-ups - 30\n
    Straddle-ups - 30\n
    Tuck-ups - 30\n
    Rest - 10\n
    Wide-arm push-ups - 45\n
    `
  )
  const [activities, setActivities] = useState([])
  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const endRef = useRef(null)
  const intervalRef = useRef(null)
  const spokenRef = useRef(-1)

  useEffect(() => {
    setActivities(parseInput(text))
  }, [])

  useEffect(() => {
    if (!running) return
    if (activities.length === 0) return setRunning(false)
    const current = activities[index]
    if (!current) return setRunning(false)
    if (remaining <= 0) {
      setRemaining(current.duration)
      endRef.current = Date.now() + current.duration * 1000
    } else {
      if (!endRef.current) endRef.current = Date.now() + remaining * 1000
    }
    intervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) {
        if (index < activities.length - 1) {
          setIndex(i => i + 1)
          const next = activities[index + 1]
          endRef.current = Date.now() + next.duration * 1000
          setRemaining(next.duration)
        } else {
          setRunning(false)
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 250)
    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running, index, activities])

  // Speak activity name when a new activity starts
  useEffect(() => {
    if (!running) return
    if (!activities || activities.length === 0) return
    const cur = activities[index]
    if (!cur) return
    if (spokenRef.current === index) return
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(cur.name)
        u.lang = 'en-UK'
        u.rate = 1
        u.pitch = 1
        window.speechSynthesis.speak(u)
      }
    } catch (err) {
      console.warn('TTS error', err)
    }
    spokenRef.current = index
  }, [index, running, activities])

  function handleStart() {
    const parsed = parseInput(text)
    if (parsed.length === 0) return alert('No valid activities found.')
    setActivities(parsed)
    setIndex(0)
    setRemaining(parsed[0].duration)
    endRef.current = Date.now() + parsed[0].duration * 1000
    // reset spoken marker so the first activity will be spoken
    spokenRef.current = -1
    setRunning(true)
  }
  function handleStop() {
    setRunning(false)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }
  function handleReset() {
    setRunning(false)
    setIndex(0)
    setRemaining(activities[0]?.duration || 0)
    endRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }
  function handleParsePreview() {
    setActivities(parseInput(text))
    setIndex(0)
    setRemaining(0)
  }

  const current = activities[index]

  return (
    <div className="app">
      <div className="panel">
        <div className="left">
          <h2>Warmup Tasks</h2>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={running}
            placeholder="e.g. V-ups - 30"
          />
          <div className="controls">
            <button onClick={handleStart} disabled={running} className="primary">
              Start
            </button>
            <button onClick={handleStop} disabled={!running}>
              Stop
            </button>
          </div>

          <div className="preview">
            <h3>Parsed Activities</h3>
            <ol>
              {activities.map((a, i) => (
                <li key={i} className={i === index ? 'active' : ''}>
                  {a.name} — {formatTime(a.duration)}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="right">
          {current ? (
            <div className="card">
              <div className="activity-name">{current.name}</div>
              <div className="countdown">{formatTime(remaining)}</div>
              <div className="progress">
                <div
                  className="bar"
                  style={{ width: `${((current.duration - remaining) / current.duration) * 100}%` }}
                />
              </div>
              <div className="next">Next: {activities[index + 1]?.name ?? '—'}</div>
            </div>
          ) : (
            <div className="placeholder">Ready to start</div>
          )}
        </div>
      </div>
    </div>
  )
}
