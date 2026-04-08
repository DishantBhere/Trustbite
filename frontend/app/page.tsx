'use client'

import { useState, useEffect, useRef } from 'react'
import { CinematicFooter } from "@/components/motion-footer"
import InfiniteGrid from "@/components/the-infinite-grid"

export default function VerifyLens() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const elaCanvasRef = useRef<HTMLCanvasElement>(null)
  const [elaAnomalyScore, setElaAnomalyScore] = useState(0)
  const [elaQuality, setElaQuality] = useState(85)
  const [amplification, setAmplification] = useState(25)

  useEffect(() => {
    if (!isAnalyzing) return

    const timers = [
      setTimeout(() => setLoadStep(1), 800),
      setTimeout(() => setLoadStep(2), 1600),
      setTimeout(() => setLoadStep(3), 2400),
      setTimeout(() => {
        setIsAnalyzing(false)
        setShowResults(true)
      }, 3500),
    ]

    return () => timers.forEach(t => clearTimeout(t))
  }, [isAnalyzing])

  // Generate ELA heatmap when image, quality, or amplification changes
  useEffect(() => {
    if (!preview || !elaCanvasRef.current) return

    const canvas = elaCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      // Draw original image
      ctx.drawImage(img, 0, 0)
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Create recompressed version at lower quality
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.drawImage(img, 0, 0)
      const jpegQuality = Math.max(0.4, elaQuality / 100)

      // Simulate JPEG recompression by blurring
      ctx.filter = `blur(${(1 - jpegQuality) * 3}px)`
      ctx.drawImage(tempCanvas, 0, 0)
      ctx.filter = 'none'
      const recompressedData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Calculate difference and apply heatmap
      const heatmapData = ctx.createImageData(canvas.width, canvas.height)
      let totalAnomaly = 0

      for (let i = 0; i < originalData.data.length; i += 4) {
        const diff =
          Math.abs(originalData.data[i] - recompressedData.data[i]) +
          Math.abs(originalData.data[i + 1] - recompressedData.data[i + 1]) +
          Math.abs(originalData.data[i + 2] - recompressedData.data[i + 2])

        const anomaly = Math.min(255, diff * amplification)
        totalAnomaly += anomaly

        // Create red-hot gradient: low = dark, high = bright red
        heatmapData.data[i] = anomaly // R
        heatmapData.data[i + 1] = Math.max(0, anomaly - 100) // G (slight)
        heatmapData.data[i + 2] = 0 // B
        heatmapData.data[i + 3] = 255 // A
      }

      ctx.putImageData(heatmapData, 0, 0)

      // Calculate anomaly score as percentage
      const score = Math.min(100, (totalAnomaly / (originalData.data.length * amplification)) * 100)
      setElaAnomalyScore(Math.round(score))
    }

    img.src = preview
  }, [preview, elaQuality, amplification])

  // Fade-up animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const fadeUpElements = document.querySelectorAll('.fade-up')
    fadeUpElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [showResults])

  // Stats count-up animation
  useEffect(() => {
    const statsElement = document.querySelector('[data-stats-section]')
    if (!statsElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const imagesEl = document.querySelector('[data-stat-images]')
          const accuracyEl = document.querySelector('[data-stat-accuracy]')
          const timeEl = document.querySelector('[data-stat-time]')

          if (imagesEl) {
            let current = 0
            const target = 2
            const duration = 1500
            const start = Date.now()
            const animate = () => {
              const elapsed = Date.now() - start
              const progress = Math.min(elapsed / duration, 1)
              const easeOut = 1 - Math.pow(1 - progress, 3)
              current = target * easeOut
              imagesEl.textContent = current.toFixed(1) === '2.0' ? '2M+' : `${current.toFixed(1)}M+`
              if (progress < 1) requestAnimationFrame(animate)
            }
            animate()
          }

          if (accuracyEl) {
            let current = 0
            const target = 99.2
            const duration = 1500
            const start = Date.now()
            const animate = () => {
              const elapsed = Date.now() - start
              const progress = Math.min(elapsed / duration, 1)
              const easeOut = 1 - Math.pow(1 - progress, 3)
              current = target * easeOut
              accuracyEl.textContent = `${current.toFixed(1)}%`
              if (progress < 1) requestAnimationFrame(animate)
            }
            animate()
          }

          if (timeEl) {
            const start = Date.now()
            const animate = () => {
              const elapsed = Date.now() - start
              const progress = Math.min(elapsed / 400, 1)
              const scale = 0.85 + progress * 0.15
              timeEl.style.transform = `scale(${scale})`
              if (progress < 1) requestAnimationFrame(animate)
            }
            animate()
          }

          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(statsElement)
    return () => observer.disconnect()
  }, [showResults])

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setShowResults(false)
    setLoadStep(0)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleStartAnalysis = async () => {
    if (!uploadedFile) return

    setLoadStep(0)
    setIsAnalyzing(true)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      console.log('Backend response:', data)

      setResult(data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const resetAnalysis = () => {
    setShowResults(false)
    setUploadedFile(null)
    setPreview(null)
    setLoadStep(0)
    setResult(null)
  }

  return (
    <main className="relative w-full overflow-x-hidden">
      {/* STICKY NAVBAR */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#FFFFFF',
          borderBottom: '1px solid #E8E0D8',
          padding: '0 2rem',
          minHeight: '64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left side - Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '09px',
                  }}
                >
          <img
            src="/fox-logo.png"
            alt="Fox"
            width={70}
            height={70}
          />
          <div
            style={{
              fontFamily: 'var(--font-big-shoulders)',
              fontWeight: 900,
              fontSize: '1.7rem',
              color: '#24003D',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
            }}
          >
            Mirova
          </div>
        </div>

        {/* Right side - GitHub button only */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* GitHub Button */}
          <button
            onClick={() => window.open('https://github.com/DishantBhere/Mirova', '_blank')}
            className="github-pulse"
            style={{
              background: '#FFFFFF',
              borderRadius: '99px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#24003D',
              border: '1px solid #24003D',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5E8E0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            {/* GitHub Octocat Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            ⭐ 2k
          </button>
        </div>
      </nav>

      {/* HERO SECTION - Bold Editorial */}
    <section
  className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden"
  style={{ backgroundColor: "#FAF5F0" }}
>
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <InfiniteGrid />
  </div>

  <div className="relative z-10 text-center max-w-5xl">
          {/* Trust Badge */}
          <div style={{ display: 'inline-block', marginBottom: '3rem', padding: '10px 20px', background: '#FFFFFF', border: 'none', borderRadius: '50px', color: '#24003D', fontSize: '0.875rem', fontWeight: 600 }}>
            Trusted by 10,000+ analysts
          </div>

          {/* Massive Headline - Bold & Oversized */}
          <h1
            style={{
              fontSize: 'clamp(4rem, 6.5vw, 7.5rem)',
              color: '#24003D',
              lineHeight: 0.92,
              fontFamily: 'var(--font-big-shoulders)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
              fontVariationSettings: '"wdth" 95',
            }}
          >
            DETECT FAKE IMAGES<br />IN SECONDS
          </h1>

          {/* Subheadline */}
          <p
            style={{
              marginBottom: '3rem',
              fontSize: '1.1rem',
              color: '#5B4263',
              maxWidth: '600px',
              margin: '1rem auto 3rem',
              fontWeight: 500,
            }}
          >
            Military-grade forensic analysis. ELA, Noise Detection & Metadata Inspection.
          </p>

          {/* CTA Button - Bold & Large */}
          <button
            onClick={() => {
              const uploadSection = document.getElementById('upload-section')
              uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            style={{
              background: '#FF6B35',
              color: '#FFFFFF',
              borderRadius: '50px',
              padding: '16px 48px',
              fontSize: '1.1rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'var(--font-big-shoulders)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E55A25';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FF6B35';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start Analysis Now
          </button>
        </div>
      </section>

      {/* UPLOAD SECTION */}
<section
  className="relative z-10 px-4 overflow-hidden"
  style={{ paddingTop: '5rem', paddingBottom: '5rem' }}
  id="upload-section"
>
  {/* GRID BACKGROUND FOR UPLOAD */}
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <InfiniteGrid />
  </div>


        <div className="max-w-2xl mx-auto">
          <div className="card p-10 fade-up">
            <div
              className={isDragging ? 'drag-over' : ''}
              style={{
                border: '2px dashed',
                borderColor: isDragging ? '#E8622A' : isHovering ? '#1A0B3B' : '#1A0B3B',
                borderStyle: isDragging ? 'solid' : 'dashed',
                background: isDragging ? 'rgba(26,11,59,0.05)' : isHovering ? '#F5EFE6' : '#F5EFE6',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                transform: isDragging ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFileUpload(file)
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />

              {!preview ? (
                <>
                  {/* Upload Icon SVG */}
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 52 52"
                    fill="none"
                    className="mx-auto mb-6 upload-icon"
                    style={{
                      transition: 'all 0.3s ease',
                      transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <path
                      d="M26 4v24M12 24l14-14 14 14"
                      stroke="#1A0B3B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 44h40"
                      stroke="#1A0B3B"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <p style={{ color: '#1A0B3B', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                    Drag & drop your image or click to browse
                  </p>

                  <p style={{ color: '#6B5B8C', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                    Supports JPG, PNG, WEBP, TIFF · Max 10MB
                  </p>

                  {/* Format Badges */}
                  <div className="flex justify-center gap-2 mt-4 flex-wrap" style={{ marginBottom: '1.5rem' }}>
                    {['JPG', 'PNG', 'WEBP', 'TIFF'].map((fmt) => (
                      <span
                        key={fmt}
                        style={{
                          padding: '6px 14px',
                          background: '#FFFFFF',
                          border: '1px solid #1A0B3B',
                          borderRadius: '9999px',
                          color: '#1A0B3B',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: '#E8622A',
                      borderRadius: '9999px',
                      padding: '12px 32px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontSize: '0.95rem',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#CF5420';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#E8622A';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Browse Files
                  </button>
                </>
              ) : (
                <>
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <img
                      src={preview}
                      alt="Preview"
                      style={{
                        maxHeight: '180px',
                        borderRadius: '12px',
                        marginBottom: '1rem',
                        display: 'block',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                      }}
                    />
                    <button
                      onClick={() => {
                        setPreview(null)
                        setUploadedFile(null)
                        setShowResults(false)
                        setResult(null)
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#2D1B69',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1E0D4E';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2D1B69';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <p style={{ color: '#2D1B69', fontWeight: 500 }}>
                    {uploadedFile?.name}
                  </p>
                  <p style={{ color: '#8B8B8B', fontSize: '0.875rem' }}>
                    {(uploadedFile?.size || 0) / 1024 / 1024 > 1
                      ? `${((uploadedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`
                      : `${((uploadedFile?.size || 0) / 1024).toFixed(2)} KB`}
                  </p>

                  {/* Analyze Image Button */}
                  <button
                    onClick={handleStartAnalysis}
                    className="cta-button"
                    style={{
                      background: '#24003D',
                      borderRadius: '99px',
                      padding: '10px 28px',
                      fontWeight: 600,
                      color: 'white',
                      border: 'none',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease, transform 0.2s ease',
                      fontSize: '0.95rem',
                      marginTop: '1rem',
                    }}
                  >
                    Analyze Image
                  </button>
                  {/* Remove gradient progress bar */}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ADVANCED SETTINGS - Bold Coral Card */}
      {showResults && (
<section
  className="relative z-10 px-4 overflow-hidden"
  style={{ paddingTop: '5rem', paddingBottom: '5rem' }}
  id="upload-section"
>
  {/* GRID BACKGROUND FOR UPLOAD */}
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <InfiniteGrid />
  </div>
<div className="max-w-2xl mx-auto">
            <div style={{ background: '#FF6B35', padding: '2rem', borderRadius: '20px' }}>
              {/* Header - Toggle only */}
              <div
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                }}
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <h3 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '1.125rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                  Advanced Settings
                </h3>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  style={{
                    transition: 'transform 0.3s',
                    transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <path
                    d="M5 7.5l5 5 5-5"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Content - Simple conditional render */}
              {settingsOpen && (
                <div className="mt-6 space-y-6">
                  {/* ELA Quality Slider */}
                  <div>
                    <div className="flex justify-between mb-3">
                      <label style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        ELA Quality (JPEG Compression)
                      </label>
                      <span style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700, fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase' }}>
                        {elaQuality}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="95"
                      value={elaQuality}
                      onChange={(e) => setElaQuality(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(to right, #24003D 0%, #24003D ${((elaQuality - 70) / (95 - 70)) * 100}%, rgba(36,0,61,0.25) ${((elaQuality - 70) / (95 - 70)) * 100}%, rgba(36,0,61,0.25) 100%)`,
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                      }}
                    />
                    <style>{`
                      input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #24003D;
                        border: 2px solid white;
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                      }
                      input[type="range"]::-moz-range-thumb {
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #24003D;
                        border: 2px solid white;
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                      }
                    `}</style>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>70</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>95</span>
                    </div>
                  </div>

                  {/* Amplification Factor Slider */}
                  <div>
                    <div className="flex justify-between mb-3">
                      <label style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        Amplification Factor
                      </label>
                      <span style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700, fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase' }}>
                        {amplification}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={amplification}
                      onChange={(e) => setAmplification(Number(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: `linear-gradient(to right, #24003D 0%, #24003D ${((amplification - 10) / (40 - 10)) * 100}%, rgba(36,0,61,0.25) ${((amplification - 10) / (40 - 10)) * 100}%, rgba(36,0,61,0.25) 100%)`,
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>10</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>40</span>
                    </div>
                  </div>

                  {/* Computed Anomaly Score */}
                  <div
                    style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: '#82ff90',
                      borderRadius: '8px',
                      border: '1px solid rgba(36,0,61,0.15)',
                    }}
                  >
                    <p style={{ color: '#24003D', fontSize: '0.85rem', margin: '0 0 0.5rem', fontWeight: 500 }}>
                      Real-time Computed ELA Score
                    </p>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B35', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {elaAnomalyScore}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* LOADING STATE */}
      {isAnalyzing && (
        <section style={{ background: '#000000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="max-w-2xl mx-auto text-center">
            {/* Spinner */}
            <div
              style={{
                width: '80px',
                height: '80px',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTop: '4px solid #C8F135',
                borderRadius: '50%',
                animation: 'spin 1.5s linear infinite',
                margin: '0 auto',
              }}
            />

            <p
              style={{
                color: '#FFFFFF',
                fontSize: '1.3rem',
                marginTop: '2rem',
                fontWeight: 800,
                fontFamily: 'var(--font-big-shoulders)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Analyzing Image Forensics
            </p>

            {/* Steps */}
            <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
              {[
                { label: 'Running ELA scan', step: 1 },
                { label: 'Checking noise patterns', step: 2 },
                { label: 'Reading metadata', step: 3 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    opacity: loadStep >= item.step ? 1 : 0,
                    transform: loadStep >= item.step ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'all 0.4s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: loadStep > item.step ? '#C8F135' : (loadStep === item.step ? '#C8F135' : 'rgba(255,255,255,0.2)'),
                      animation: item.step === loadStep ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                    {item.label}
                  </span>
                  {loadStep > item.step && (
                    <span style={{ color: '#C8F135', marginLeft: 'auto', fontWeight: 'bold' }}>✓</span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div
              style={{
                marginTop: '2.5rem',
                height: '4px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#C8F135',
                  borderRadius: '2px',
                  width: `${(loadStep / 3) * 100}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* RESULTS SECTION */}
      {showResults && (
<section
  className="relative z-10 px-4 overflow-hidden"
  style={{ paddingTop: '5rem', paddingBottom: '5rem' }}
  id="upload-section"
>
  {/* GRID BACKGROUND FOR UPLOAD */}
  <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
    <InfiniteGrid />
  </div>
<div className="max-w-6xl mx-auto">
            {/* ELA HEATMAP SIDE-BY-SIDE */}
            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{ color: '#24003D', fontWeight: 800, fontSize: '1.75rem', marginBottom: '2rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Analysis Results
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Original Image Panel */}
                <div>
                  <h4 style={{ color: '#24003D', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    📷 Original Image
                  </h4>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D0C8C0',
                      borderRadius: '20px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '1rem', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(0,0,0,0.3)' }}>
                      {preview && (
                        <img src={preview} alt="Original" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* ELA Heatmap Panel */}
                <div>
                  <h4 style={{ color: '#24003D', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    🔥 ELA Heatmap
                  </h4>
                  <div
                    style={{
                      background: '#c6c6c6',
                      border: '1px solid #D0C8C0',
                      borderRadius: '20px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '1rem', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
                      {preview ? (
                        <canvas
                          ref={elaCanvasRef}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: '8px',
                            imageRendering: 'pixelated',
                          }}
                        />
                      ) : (
                        <div style={{ color: 'rgba(220,200,255,0.5)' }}>Upload an image to see ELA heatmap</div>
                      )}
                    </div>
                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(139,92,246,0.2)', color: '#8e2701', fontSize: '0.8rem', textAlign: 'center' }}>
                      ✨ Brighter areas indicate potential manipulation
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DETAILED ANALYSIS REPORT SECTION - Black Background */}
            <section style={{ marginTop: '5rem', marginBottom: '3rem', padding: '80px 2rem', background: '#1A1A1A', borderRadius: '20px', borderTop: '3px solid #C8F135' }}>
              <div>
              <h2 style={{ color: '#C8F135', fontWeight: 800, fontSize: '1.75rem', marginBottom: '2rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Detailed Analysis Report
              </h2>

              {/* Risk Score Banner */}
              <div style={{ marginBottom: '2rem', padding: '2rem', background: '#24003D', border: 'none', borderRadius: '20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {elaAnomalyScore}%
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: '0.5rem 0 0' }}>
                    ELA Anomaly Score (Computed in Real-time)
                  </p>
                </div>
                <div className="risk-badge" style={{ display: 'inline-block', padding: '8px 24px', borderRadius: '9999px', background: elaAnomalyScore > 70 ? '#FF6B35' : elaAnomalyScore > 40 ? 'rgba(200,241,53,0.2)' : '#A8F0C6', border: 'none', color: elaAnomalyScore > 70 ? '#FFFFFF' : elaAnomalyScore > 40 ? '#1A1A1A' : '#1A1A1A', fontWeight: 600, fontSize: '0.875rem' }}>
                  {elaAnomalyScore > 70 ? '🔴 HIGH RISK — Strong signs of manipulation detected' : elaAnomalyScore > 40 ? '⚠ MEDIUM RISK — Some anomalies detected' : '✓ LOW RISK — Image appears authentic'}
                </div>
              </div>

              {/* Three Column Analysis Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Metadata Analysis */}
                <div style={{ background: '#A8F0C6', border: 'none', borderRadius: '16px', padding: '1.5rem' }}>
                  <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
                    🧾 Metadata Analysis
                  </h3>
                  <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: 'rgba(26,26,26,0.15)', border: 'none', color: '#24003D', fontSize: '0.75rem', fontWeight: 600, marginBottom: '1rem' }}>
                    LOW RISK
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      EXIF data present and consistent
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      Timestamps match modification dates
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      Camera settings plausible
                    </li>
                  </ul>
                </div>

                {/* ELA Analysis */}
                <div style={{ background: '#D4B8FF', border: 'none', borderRadius: '16px', padding: '1.5rem' }}>
                  <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
                    📊 ELA Analysis
                  </h3>
                  <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: elaAnomalyScore > 70 ? '#FF6B35' : elaAnomalyScore > 40 ? 'rgba(26,26,26,0.15)' : 'rgba(26,26,26,0.15)', border: 'none', color: elaAnomalyScore > 70 ? '#FFFFFF' : '#24003D', fontSize: '0.75rem', fontWeight: 600, marginBottom: '1rem' }}>
                    {elaAnomalyScore > 70 ? 'HIGH RISK' : elaAnomalyScore > 40 ? 'MEDIUM RISK' : 'LOW RISK'}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#24003D', fontSize: '0.85rem', margin: 0 }}>
                      Computed Anomaly Score: <span style={{ color: elaAnomalyScore > 70 ? '#FF6B35' : elaAnomalyScore > 40 ? '#1A1A1A' : '#1A1A1A', fontWeight: 700 }}>{elaAnomalyScore}%</span>
                    </p>
                    <p style={{ color: '#24003D', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                      {elaAnomalyScore > 70 ? '🔴 Strong compression inconsistencies detected' : elaAnomalyScore > 40 ? '⚠ Localized compression anomalies detected' : '✓ Compression pattern is consistent'}
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>{elaAnomalyScore > 40 ? '!' : '✓'}</span>
                      {elaAnomalyScore > 40 ? 'Compression artifacts' : 'Normal'} in spatial regions
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>{elaAnomalyScore > 40 ? '!' : '✓'}</span>
                      Noise distribution {elaAnomalyScore > 40 ? 'variance detected' : 'uniform'}
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>{elaAnomalyScore > 40 ? '!' : '✓'}</span>
                      Edge {elaAnomalyScore > 40 ? 'blurring suggests' : 'transitions are'} natural
                    </li>
                  </ul>
                </div>

                {/* Noise Analysis */}
                <div style={{ background: '#FFB8A0', border: 'none', borderRadius: '16px', padding: '1.5rem' }}>
                  <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
                    🎯 Noise Analysis
                  </h3>
                  <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', background: 'rgba(26,26,26,0.15)', border: 'none', color: '#24003D', fontSize: '0.75rem', fontWeight: 600, marginBottom: '1rem' }}>
                    LOW RISK
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#24003D', fontSize: '0.85rem', margin: 0 }}>
                      Inconsistency Score: <span style={{ color: '#24003D', fontWeight: 700 }}>38%</span>
                    </p>
                    <p style={{ color: '#24003D', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                      Overall Variance: <span style={{ color: '#24003D', fontWeight: 700 }}>12%</span>
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      Noise distribution mostly uniform
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      No suspicious frequency spikes
                    </li>
                    <li style={{ color: '#24003D', fontSize: '0.9rem', paddingLeft: '1.5rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      Natural JPEG compression observed
                    </li>
                  </ul>
                </div>
              </div>

              {/* Interpretation Guide */}
              <div style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', padding: '2rem' }}>
                <h3 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.125rem', marginBottom: '1.5rem' }}>
                  📚 Interpretation Guide
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  <div>
                    <h4 style={{ color: '#C8F135', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      Understanding the ELA Heatmap
                    </h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                      The heatmap shows compression error levels across the image. Brighter areas (red/pink) indicate higher compression errors, which often suggest digital manipulation or editing. Consistent, evenly-distributed coloring suggests the image is unaltered. Localized hot spots warrant further investigation.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#C8F135', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      Score Interpretation
                    </h4>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#A8F0C6', fontWeight: 700 }}>Low Risk (0-40%)</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}> — Image appears authentic</span>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#C8F135', fontWeight: 700 }}>Medium Risk (41-70%)</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}> — Some anomalies detected</span>
                      </div>
                      <div>
                        <span style={{ color: '#FF6B35', fontWeight: 700 }}>High Risk (71-100%)</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}> — Strong signs of manipulation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
      </section>

            {/* Original Metrics Display - Black background */}
            <div className="p-10" style={{ background: '#000000', borderRadius: '20px', borderTop: '3px solid #C8F135' }}>
              <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
                {/* Left Column - Score Ring */}
                <div style={{ flex: '0 0 240px', textAlign: 'center' }}>
                  <svg
                    viewBox="0 0 200 200"
                    style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}
                  >
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#C8F135" />
                        <stop offset="100%" stopColor="#C8F135" />
                      </linearGradient>
                      <filter id="ringGlow">
                        <feGaussianBlur stdDeviation="0" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="16"
                      fill="none"
                    />

                    {/* Animated arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      stroke="url(#scoreGrad)"
                      strokeWidth="16"
                      fill="none"
                      strokeLinecap="round"
                      filter="url(#ringGlow)"
                      style={{
                        strokeDasharray: 502.65,
                        strokeDashoffset: 502.65 * (1 - (result?.score || 0) / 100),
                        transition: 'stroke-dashoffset 1.5s ease-out',
                        transformOrigin: '100px 100px',
                        transform: 'rotate(-90deg)',
                      }}
                    />

                    {/* Center text */}
                    <text
                      x="100"
                      y="120"
                      textAnchor="middle"
                      style={{
                        fontSize: '2.8rem',
                        fontWeight: 800,
                        fill: '#FFFFFF',
                        fontFamily: 'Big Shoulders Display, var(--font-big-shoulders)',
                      }}
                    >
                      {result?.score || 0}%
                    </text>
                  </svg>

                  <p
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.9rem',
                      marginTop: '1rem',
                    }}
                  >
                    Authenticity Score
                  </p>
                </div>

                {/* Right Column - Metrics */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div className="space-y-3">
                    {[
                      { label: 'ELA Score', value: result?.ela_score || 0, color: '#C8F135' },
                      { label: 'Noise Score', value: Math.round(result?.noise?.overall_variance || 0), color: '#FF6B35' },
                      { label: 'Metadata Score', value: result?.metadata ? 80 : 0, color: '#A8F0C6' },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        style={{
                          background: 'transparent',
                          backdropFilter: 'none',
                          border: 'none',
                          borderLeft: `3px solid #C8F135`,
                          borderRadius: '0',
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600 }}>
                          {metric.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              color: '#FFFFFF',
                              fontSize: '1.6rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-big-shoulders)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {metric.value}
                          </span>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: metric.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Risk Badge Section */}
              <div
                style={{
                  marginTop: '2rem',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: '8px 28px',
                    borderRadius: '9999px',
                    background: '#FF6B35',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    boxShadow: 'none',
                  }}
                >
                  {result?.risk || 'No Data'}
                </div>

                <p
                  style={{
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    maxWidth: '520px',
                    margin: '1rem auto 0',
                    lineHeight: 1.6,
                  }}
                >
                  Our analysis detected inconsistencies in compression patterns and noise distribution. Some regions show signs of localized editing. Manual review recommended.
                </p>

                {/* Analyze Another Image Button */}
                <button
                  onClick={resetAnalysis}
                  style={{
                    borderRadius: '50px',
                    padding: '10px 28px',
                    fontWeight: 600,
                    color: '#24003D',
                    border: 'none',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontSize: '0.95rem',
                    marginTop: '1.5rem',
                    display: 'block',
                    margin: '1.5rem auto 0',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5E8E0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  Analyze Another Image
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS - Black background with colored cards */}
      <section className="relative z-10 px-4" style={{ paddingTop: '5rem', paddingBottom: '5rem', background: '#1A1A1A' }}>
        <div className="max-w-4xl mx-auto">
            <h2
              className="fade-up"
              style={{
                marginBottom: '1rem',
                fontSize: '3rem',
                fontWeight: 800,
                fontFamily: 'var(--font-big-shoulders)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
            How It Works
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
              marginBottom: '3rem',
              fontSize: '1rem',
            }}
          >
            Three forensic techniques working in unison
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '1.5rem',
            }}
            className="md:grid-cols-3 grid-cols-1"
          >
            {[
              {
                title: 'Metadata Inspection',
                desc: 'Reads EXIF data, timestamps, and file headers to detect missing or modified metadata that signals tampering.',
                icon: '📄',
                color: '#A8F0C6',
              },
              {
                title: 'Error Level Analysis',
                desc: 'Detects compression artifacts and inconsistencies in JPEG quality levels across different image regions.',
                icon: '📊',
                color: '#D4B8FF',
              },
              {
                title: 'Noise Pattern Analysis',
                desc: 'Examines pixel-level noise distribution to find unnaturally smooth or inconsistent regions left by editing tools.',
                icon: '🔬',
                color: '#FFB8A0',
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="card-hover-lift fade-up"
                style={{
                  background: card.color,
                  border: 'none',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.08)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  {card.icon}
                </div>

                <h3 style={{ color: '#24003D', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {card.title}
                </h3>

                <p style={{ color: '#24003D', fontSize: '14px', fontWeight: 500, lineHeight: 1.6 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR INVESTIGATORS SECTION - Lime Background */}
      <section className="relative z-10 px-4" style={{ paddingTop: '5rem', paddingBottom: '5rem', background: '#C8F135' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '5rem 2rem' }}>
          {/* TOP - Centered Heading Block */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            {/* Label Pill */}
            <div
              style={{
                display: 'inline-block',
                border: 'none',
                color: '#1A1A1A',
                fontSize: '0.6875rem',
                letterSpacing: '0.1em',
                padding: '4px 14px',
                borderRadius: '99px',
                background: 'rgba(26,26,26,0.15)',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              WHO IT'S FOR
            </div>

            {/* Heading */}
          <h2
            className="fade-up"
            style={{
              marginBottom: '1rem',
              fontSize: '3rem',
              fontWeight: 800,
              fontFamily: 'var(--font-big-shoulders)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
              Built for the people who demand truth
            </h2>

            {/* Subtext */}
            <p
              style={{
                color: '#1A1A1A',
                textAlign: 'center',
                fontSize: '1rem',
                maxWidth: '560px',
                margin: '0.75rem auto 3rem',
                lineHeight: '1.6',
              }}
            >
              Trusted by investigators, journalists, and security professionals worldwide
            </p>
          </div>

          {/* MIDDLE - 3-Card Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '1.5rem',
              marginBottom: '3.5rem',
            }}
            className="md:grid-cols-3 grid-cols-1"
          >
            {/* Card 1 - Investigators */}
            <div
              className="fade-up"
              style={{
                background: '#FF6B35',
                border: 'none',
                borderRadius: '20px',
                padding: '2rem',
                minHeight: '200px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 50px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
              }}
            >
              {/* Icon Circle */}
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  background: 'rgba(255,255,255,0.3)',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', margin: '1rem 0 0.5rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Investigators
              </h3>
              <p style={{ color: '#24003D', fontSize: '0.875rem', lineHeight: '1.65' }}>
                Verify digital evidence and detect tampered images before they reach the courtroom.
              </p>
            </div>

            {/* Card 2 - Journalists */}
            <div
              className="fade-up"
              style={{
                background: '#A8F0C6',
                border: 'none',
                borderRadius: '20px',
                padding: '2rem',
                minHeight: '200px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 50px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
              }}
            >
              {/* Icon Circle */}
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  background: 'rgba(26,26,26,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </div>
              <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', margin: '1rem 0 0.5rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Journalists
              </h3>
              <p style={{ color: '#24003D', fontSize: '0.875rem', lineHeight: '1.65' }}>
                Authenticate images in breaking news to stop misinformation before it spreads.
              </p>
            </div>

            {/* Card 3 - Security Teams */}
            <div
              className="fade-up"
              style={{
                background: '#D4B8FF',
                border: 'none',
                borderRadius: '20px',
                padding: '2rem',
                minHeight: '200px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 50px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
              }}
            >
              {/* Icon Circle */}
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  background: 'rgba(26,26,26,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 style={{ color: '#24003D', fontWeight: 700, fontSize: '1rem', margin: '1rem 0 0.5rem', fontFamily: 'var(--font-big-shoulders)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Security Teams
              </h3>
              <p style={{ color: '#24003D', fontSize: '0.875rem', lineHeight: '1.65' }}>
                Detect synthetic media and deepfakes across enterprise communications at scale.
              </p>
            </div>
          </div>

          {/* BOTTOM - Stats Banner - Direct on lime background, no inner card */}
          <div
            data-stats-section
            style={{
              background: '#C8F135',
              borderRadius: '0',
              padding: '3rem 2rem',
              maxWidth: '100%',
              margin: '3.5rem auto 0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Label pill */}
            <div
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: '11px',
                letterSpacing: '0.12em',
                color: '#FFFFFF',
                border: 'none',
                background: '#24003D',
                padding: '5px 16px',
                borderRadius: '99px',
                textTransform: 'uppercase',
                fontWeight: 600,
                width: 'fit-content',
                margin: '0 auto 2.5rem',
              }}
            >
              BY THE NUMBERS
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'stretch',
                gap: 0,
                marginBottom: 0,
                flexWrap: 'wrap',
              }}
            >
              {/* Stat 1 */}
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '1.5rem 2rem',
                  borderRadius: '0',
                  transition: 'none',
                  cursor: 'default',
                  minWidth: '180px',
                  background: 'transparent',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#24003D" strokeWidth="1.6" style={{ margin: '0 auto 1rem', display: 'block' }}>
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <div
                  data-stat-images
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    display: 'block',
                    color: '#24003D',
                    fontFamily: 'var(--font-big-shoulders)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  2M+
                </div>
                <div style={{ color: 'rgba(36,0,61,0.7)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  Images Analyzed
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: '1px',
                  background: 'rgba(36,0,61,0.2)',
                  flexShrink: 0,
                  margin: '1rem 0',
                }}
              />

              {/* Stat 2 */}
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '1.5rem 2rem',
                  borderRadius: '0',
                  transition: 'none',
                  cursor: 'default',
                  minWidth: '180px',
                  background: 'transparent',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#24003D" strokeWidth="1.6" style={{ margin: '0 auto 1rem', display: 'block' }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <div
                  data-stat-accuracy
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    display: 'block',
                    color: '#24003D',
                    fontFamily: 'var(--font-big-shoulders)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  99.2%
                </div>
                <div style={{ color: 'rgba(36,0,61,0.7)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  Detection Accuracy
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: '1px',
                  background: 'rgba(36,0,61,0.2)',
                  flexShrink: 0,
                  margin: '1rem 0',
                }}
              />

              {/* Stat 3 */}
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '1.5rem 2rem',
                  borderRadius: '0',
                  transition: 'none',
                  cursor: 'default',
                  minWidth: '180px',
                  background: 'transparent',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#24003D" strokeWidth="1.6" style={{ margin: '0 auto 1rem', display: 'block' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <div
                  data-stat-time
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    display: 'block',
                    color: '#24003D',
                    fontFamily: 'var(--font-big-shoulders)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  &lt;3S
                </div>
                <div style={{ color: 'rgba(36,0,61,0.7)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  Average Analysis Time
                </div>
              </div>
            </div>

            {/* Footer text */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(36,0,61,0.15)',
                color: 'rgba(36,0,61,0.5)',
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
              }}
            >
              Trusted by analysts across 40+ countries
            </div>
          </div>
        </div>
      </section>

<CinematicFooter />

    </main>
  )
}
