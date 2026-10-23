'use client'

import { useEffect, useRef, useState } from 'react'
import MissionJoinCard from './MissionJoinCard'

const layers = [
  {
    name: 'Settee and gramophone',
    file: 'sette and gramaphone.png',
    x: 336, y: 487, w: 555, h: 312,
  },
  {
    name: 'Woman reading The Parlor',
    file: 'Victorian Woman Reading The Parlor 1@2x.png',
    x: 0, y: 463, w: 601, h: 549,
  },
  {
    name: 'Woman reading a book',
    file: 'woman reading a book.png',
    x: 891, y: 351, w: 299, h: 448,
  },
  {
    name: 'Tea table and chairs',
    file: 'tabnle and chairs.png',
    x: 976, y: 579, w: 476, h: 318,
  },
]

export default function MissionRoom() {
  const [joinEmail, setJoinEmail] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinSent, setJoinSent] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function handleJoinSubmit(event) {
    event.preventDefault()
    if (!joinEmail.trim() || joinLoading) return

    setJoinLoading(true)
    setJoinError('')

    try {
      const email = joinEmail.trim()
      const returnTo = window.location.pathname

      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })

      if (!response.ok) throw new Error('Email check failed')

      const data = await response.json()

      if (data.exists) {
        setJoinSent(true)
      } else {
        const params = new URLSearchParams({
          email,
          source: 'mission-page',
          returnTo,
        })
        window.location.href = `/signup?${params}`
      }
    } catch {
      setJoinError('Something went wrong. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  const roomRef = useRef(null)

  useEffect(() => {
    const room = roomRef.current
    if (!room) return

    let cancelled = false
    let context
    let cleanupListeners = () => {}

    async function initializeAnimation() {
      const { gsap } = await import('gsap')
      if (cancelled) return

      context = gsap.context(() => {
        const viewport = room.parentElement
        const gradient = viewport.querySelector('.parlor-opening-gradient')
        const eyebrow = viewport.querySelector('.parlor-mission-label')
        const heading = viewport.querySelector('.parlor-mission-caption h1')
        const subtitle = viewport.querySelector('.parlor-mission-caption p')
        const dimmer = room.querySelector('.parlor-room-dimmer')
        const background = room.querySelector('.parlor-room-background')
        const openingCue = viewport.querySelector(
          '.parlor-scroll-cue:not(.parlor-story-scroll-cue)'
        )
        const storyCue = viewport.querySelector('.parlor-story-scroll-cue')
        const story = viewport.querySelector('.parlor-story-one')
        const thirdStory = viewport.querySelector('.parlor-story-three')
        const thirdHeading = thirdStory.querySelector('h2')
        const thirdParagraphs = thirdStory.querySelectorAll('p')
        const thirdCue = thirdStory.querySelector('.parlor-third-cue')
        const fourthStory = viewport.querySelector('.parlor-story-four')
        const fourthHeading = fourthStory.querySelector('h2')
        const fourthParagraphs = fourthStory.querySelectorAll('p')
        const fourthBackCue = fourthStory.querySelector('.parlor-four-back-cue')
        const fourthDownCue = viewport.querySelector('.parlor-four-down-cue')
        const firstWoman = room.querySelector('[data-layer="first-woman"]')
        const settee = room.querySelector('[data-layer="settee"]')
        const readingWoman = room.querySelector('[data-layer="reading-woman"]')

        if (!firstWoman || !settee || !readingWoman) {
          console.error('Mission room character or settee layer missing.')
          return
        }

        const lines = story.querySelectorAll('.parlor-story-line')
        const emphasis = story.querySelector('.parlor-story-emphasis')

        let scene = 0
        let busy = true
        let storyPlayed = false
        let thirdStoryPlayed = false
        let lastTransition = 0

        gsap.set(room, {
          scale: 1,
          xPercent: 0,
          x: 0,
          y: 0,
          transformOrigin: 'center center',
        })
        gsap.set(firstWoman, { opacity: 1 })
        gsap.set(settee, { zIndex: 1 })
        gsap.set(story, { autoAlpha: 0 })
        gsap.set(storyCue, { opacity: 0 })
        gsap.set(lines, { opacity: 0, y: 14 })
        gsap.set(emphasis, { opacity: 0, y: 14 })

        const ready = () => {
          lastTransition = Date.now()
          busy = false
        }

        const opening = gsap.timeline({
          delay: 0.35,
          onComplete: ready,
        })

        opening
          .to(gradient, {
            opacity: 1,
            duration: 1.2,
            ease: 'power2.inOut',
          })
          .to(heading, {
            opacity: 1,
            filter: 'blur(0px)',
            duration: 1.8,
            ease: 'power2.out',
          })
          .to([eyebrow, subtitle], {
            opacity: 1,
            duration: 0.9,
            ease: 'power2.out',
          }, '-=0.25')
          .to(openingCue, {
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
          }, '>-0.1')

        const storyAnimation = gsap.timeline({
          paused: true,
          onStart: () => gsap.set(story, { autoAlpha: 1 }),
          onComplete: () => {
            storyPlayed = true
            ready()
          },
        })

        storyAnimation
          .to(lines[0], {
            opacity: 1, y: 0, duration: 0.8,
          })
          .to(lines[1], {
            opacity: 1, y: 0, duration: 0.8,
          }, '-=0.15')
          .to(emphasis, {
            opacity: 1,
            y: 0,
            textShadow: '0 0 24px rgba(255,185,220,1), 0 0 65px rgba(255,130,195,0.95)',
            duration: 1.1,
          }, '+=0.35')
          .to(emphasis, {
            textShadow: '0 0 16px rgba(255,175,210,0.5)',
            duration: 1,
          })
          .to([lines[2], lines[3], lines[4]], {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.65,
          }, '+=0.2')
          .to(storyCue, {
            opacity: 1,
            duration: 0.8,
          }, '+=0.6')

        gsap.set(thirdStory, { autoAlpha: 0 })
        gsap.set(thirdHeading, { opacity: 0, y: 18 })
        gsap.set(thirdParagraphs, { opacity: 0, y: 14 })
        gsap.set(thirdCue, { opacity: 0 })

        const thirdAnimation = gsap.timeline({
          paused: true,
          onStart: () => gsap.set(thirdStory, { autoAlpha: 1 }),
          onComplete: () => {
            thirdStoryPlayed = true
            ready()
          },
        })

        thirdAnimation
          .to(thirdHeading, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power2.out',
          })
          .to(thirdParagraphs[0], {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out',
          }, '+=0.3')
          .fromTo(thirdParagraphs[0].querySelectorAll('.parlor-keyword'),
            {
              scale: 0.9,
              filter: 'brightness(1)',
              textShadow: '0 0 0px rgba(255,255,255,0)',
            },
            {
              scale: 1.12,
              filter: 'brightness(1)',
              textShadow: '0 0 8px rgba(255,255,255,0.65), 0 0 22px rgba(255,145,195,1), 0 0 42px rgba(255,110,180,0.85)',
              duration: 0.45,
              stagger: 0.22,
              ease: 'back.out(1.5)',
            }, '-=0.15')
          .to(thirdParagraphs[0].querySelectorAll('.parlor-keyword'), {
            scale: 1,
            filter: 'brightness(1)',
            textShadow: '0 0 8px rgba(255,175,210,0.55)',
            duration: 0.5,
            stagger: 0.22,
          })

          .to(thirdParagraphs[1], {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out',
          }, '+=0.3')
          .fromTo(thirdParagraphs[1].querySelectorAll('.parlor-keyword'),
            {
              scale: 0.9,
              filter: 'brightness(1)',
              textShadow: '0 0 0px rgba(255,255,255,0)',
            },
            {
              scale: 1.12,
              filter: 'brightness(1)',
              textShadow: '0 0 8px rgba(255,255,255,0.65), 0 0 22px rgba(255,145,195,1), 0 0 42px rgba(255,110,180,0.85)',
              duration: 0.45,
              stagger: 0.3,
              ease: 'back.out(1.5)',
            }, '-=0.15')
          .to(thirdParagraphs[1].querySelectorAll('.parlor-keyword'), {
            scale: 1,
            filter: 'brightness(1)',
            textShadow: '0 0 8px rgba(255,175,210,0.55)',
            duration: 0.5,
            stagger: 0.3,
          })
          .to(thirdCue, {
            opacity: 1,
            duration: 0.9,
            ease: 'power2.out',
          }, '+=0.4')

        // FRAME FOUR — OUR PERSPECTIVE
        let fourthStoryPlayed = false

        gsap.set(fourthStory, { autoAlpha: 0 })
        gsap.set(fourthHeading, { opacity: 0, y: 18 })
        gsap.set(fourthParagraphs, { opacity: 0, y: 14 })
        gsap.set([fourthBackCue, fourthDownCue], { opacity: 0 })

        const fourthAnimation = gsap.timeline({
          paused: true,
          onStart: () => {
            gsap.set(fourthStory, { autoAlpha: 1 })
            gsap.to(fourthBackCue, { opacity: 1, duration: 0.5 })
          },
          onComplete: () => {
            fourthStoryPlayed = true
            ready()
          },
        })

        fourthAnimation.to(fourthHeading, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: 'power2.out',
        })

        fourthParagraphs.forEach((paragraph) => {
          fourthAnimation.to(paragraph, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power2.out',
          }, '+=0.25')

          const keywords = paragraph.querySelectorAll('.parlor-keyword')

          if (keywords.length) {
            fourthAnimation
              .fromTo(keywords, {
                textShadow: '0 0 0px rgba(255,255,255,0)',
              }, {
                textShadow: '0 0 8px rgba(255,255,255,.65), 0 0 22px rgba(255,145,195,1), 0 0 42px rgba(255,110,180,.85)',
                duration: 0.45,
                stagger: 0.22,
              }, '-=0.1')
              .to(keywords, {
                textShadow: '0 0 8px rgba(255,175,210,.55)',
                duration: 0.5,
              })
          }
        })

        fourthAnimation.call(() => {
          gsap.set(fourthDownCue, { opacity: 1 })
        }, null, '+=0.4')

        function moveTo(next) {
          if (busy || next === scene || scene === 5) return
          const sceneBefore = scene
          busy = true
          scene = next

          // Keep the foreground layers crisp while gently softening the room
          // behind each zoom. Returning to the opening restores a sharp room.
          if (background) gsap.to(background, {
            '--mission-background-blur': `${[0, 0.8, 1, 1.2, 1.4, 1.4][next]}px`,
            duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.2,
            ease: 'power2.inOut',
            overwrite: 'auto',
          })

          if (next === 1) {
            gsap.set(thirdStory, { autoAlpha: 0 })
            gsap.set(thirdCue, { opacity: 0 })
            const fromOpening = gsap.getProperty(room, 'scale') < 1.2

            const timeline = gsap.timeline({
              onComplete: () => {
                if (!storyPlayed) {
                  storyAnimation.play(0)
                } else {
                  gsap.set(story, { autoAlpha: 1 })
                  gsap.set(storyCue, { opacity: 1 })
                  ready()
                }
              },
            })

            timeline
              .to([heading, eyebrow, subtitle, gradient, openingCue], {
                opacity: 0,
                duration: 0.5,
              }, 0)
              .to(room, {
                scale: 1.55,
                xPercent: 24,
                x: 0,
                y: 0,
                duration: 1.7,
                ease: 'power2.inOut',
              }, 0)
              .to(dimmer, {
                opacity: 1,
                duration: 0.8,
              }, 0.6)
              .to(firstWoman, {
                opacity: 1,
                duration: 0.5,
              }, 0)
              .set(settee, { zIndex: 1 })

            if (!fromOpening) {
              timeline.to(story, { autoAlpha: 1, duration: 0.4 }, 0.7)
            }
          }

          if (next === 0) {
            gsap.timeline({ onComplete: ready })
              .to([story, storyCue], {
                opacity: 0,
                duration: 0.35,
              }, 0)
              .set(story, { visibility: 'hidden' })
              .to(room, {
                scale: 1,
                xPercent: 0,
                x: 0,
                y: 0,
                duration: 1.7,
                ease: 'power2.inOut',
              }, 0)
              .to(dimmer, {
                opacity: 0,
                duration: 0.8,
              }, 0.6)
              .to([heading, eyebrow, subtitle, gradient, openingCue], {
                opacity: 1,
                duration: 0.8,
              }, 1)
          }

          if (next === 2) {
            // The first scene's down arrow should not appear here.
            gsap.killTweensOf(storyCue)
            gsap.set(storyCue, { opacity: 0 })

            // Hide Our Perspective when returning to the settee.
            fourthAnimation.pause()
            gsap.killTweensOf([fourthStory, fourthBackCue, fourthDownCue])
            gsap.set(fourthStory, { autoAlpha: 0 })
            gsap.set([fourthBackCue, fourthDownCue], { opacity: 0 })

            gsap.set(readingWoman, { zIndex: 1 })
            // Center the settee and gramophone using their Figma coordinates.
            const scale = 2.07
            const targetX =
              (0.5 - (336 + 555 / 2) / 1536) * room.clientWidth * scale
            const targetY =
              (0.5 - (487 + 312 / 2) / 1024) * room.clientHeight * scale

            gsap.timeline({
              onComplete: () => {
                if (!thirdStoryPlayed) {
                  thirdAnimation.play(0)
                } else {
                  gsap.set(thirdStory, { autoAlpha: 1 })
                  gsap.set(thirdCue, { opacity: 1 })
                  ready()
                }
              },
            })
              .to([story, storyCue], {
                opacity: 0,
                duration: 0.45,
              }, 0)
              .set(story, { visibility: 'hidden' })
              .to(firstWoman, {
                opacity: 0,
                duration: 0.85,
                ease: 'power2.inOut',
              }, 0.15)
              .set(settee, { zIndex: 4 }, 0.75)
              .to(room, {
                scale,
                xPercent: 0,
                x: targetX,
                y: targetY,
                duration: 2,
                ease: 'power2.inOut',
              }, 0.2)
          }
          if (next === 4 && sceneBefore !== 5) {
            const teaTable = viewport.querySelector('[data-layer="tea-table"]')
            const fifthStory = viewport.querySelector('.parlor-story-five')

            if (!teaTable || !fifthStory) {
              console.warn('Final scene elements not found')
              ready()
              return
            }

            const scale = 2.07
            // Shift the composition left and slightly downward.
            const targetX =
              (0.5 - (976 + 476 / 2) / 1536) * room.clientWidth * scale
              + room.clientWidth * 0.18
            const targetY =
              (0.5 - (579 + 318 / 2) / 1024) * room.clientHeight * scale
              + room.clientHeight * 0.18

            gsap.set(fifthStory, { autoAlpha: 0 })
            const finalDownCue = fifthStory.querySelector('.parlor-five-down-cue')
            if (finalDownCue) gsap.set(finalDownCue, { opacity: 0 })
            gsap.set(fifthStory.querySelectorAll('h2, p'), {
              opacity: 0,
              y: 20,
            })

            const timeline = gsap.timeline({
              onComplete: ready,
            })

            timeline
              .to([fourthStory, fourthBackCue, fourthDownCue], {
                opacity: 0,
                duration: 0.5,
              }, 0)
              .set(fourthStory, { visibility: 'hidden' })
              .to(room, {
                scale,
                xPercent: 0,
                x: targetX,
                y: targetY,
                duration: 2.3,
                ease: 'power2.inOut',
              }, 0.15)
              .to(teaTable, {
                filter: 'brightness(1)',
                duration: 1.5,
                ease: 'power2.inOut',
              }, 0.8)
              .to(readingWoman, {
                filter: 'brightness(0.28)',
                duration: 1.2,
                ease: 'power2.inOut',
              }, 0.3)
              .set(fifthStory, { autoAlpha: 1 }, 2.3)
              .to(fifthStory.querySelector('h2'), {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power2.out',
              })

            fifthStory.querySelectorAll('p').forEach((paragraph) => {
              timeline.to(paragraph, {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
              }, '+=0.3')
            })

            if (finalDownCue) {
              timeline.to(finalDownCue, {
                opacity: 1,
                duration: 0.8,
                ease: 'power2.out',
              }, '+=0.6')
            }
          }

          if (next === 5) {
            const fifthStory = viewport.querySelector('.parlor-story-five')
            const joinOverlay = viewport.querySelector('.parlor-join-overlay')
            const joinCard = viewport.querySelector('.parlor-join-card')

            gsap.set(joinOverlay, {
              autoAlpha: 0,
              pointerEvents: 'none',
            })
            gsap.set(joinCard, { y: 75 })

            gsap.timeline({ onComplete: ready })
              .to(fifthStory, {
                autoAlpha: 0,
                duration: 0.65,
                ease: 'power2.inOut',
              })
              .set(joinOverlay, {
                visibility: 'visible',
                pointerEvents: 'auto',
              })
              .to(joinOverlay, {
                opacity: 1,
                duration: 0.65,
                ease: 'power2.out',
              })
              .to(joinCard, {
                y: 0,
                duration: 0.9,
                ease: 'power3.out',
              }, '<')
          }

          if (next === 3) {
            // Hide the final scene before returning to Our Perspective.
            const fifthStory = viewport.querySelector('.parlor-story-five')
            gsap.killTweensOf(fifthStory)
            gsap.killTweensOf(fifthStory.querySelectorAll('h2, p'))
            gsap.set(fifthStory, { autoAlpha: 0 })

            const scale = 2.07
            const targetX =
              (0.5 - (891 + 299 / 2) / 1536) * room.clientWidth * scale
            const targetY =
              (0.5 - (351 + 448 / 2) / 1024) * room.clientHeight * scale

            gsap.timeline({
              onComplete: () => {
                if (!fourthStoryPlayed) {
                  fourthAnimation.play(0)
                } else {
                  gsap.set(fourthStory, { autoAlpha: 1 })
                  gsap.set(fourthBackCue, { opacity: 1 })
                  gsap.set(fourthDownCue, { opacity: 1 })
                  ready()
                }
              },
            })
              .to([thirdStory, thirdCue], {
                opacity: 0,
                duration: 0.55,
              }, 0)
              .set(thirdStory, { visibility: 'hidden' })
              .set(settee, { zIndex: 1 }, 0.6)
              .set(readingWoman, { zIndex: 4 }, 0.6)
              .to(room, {
                scale,
                xPercent: 0,
                x: targetX,
                y: targetY,
                duration: 2.1,
                ease: 'power2.inOut',
              }, 0.15)
          }
        }

        function roomIsActive() {
          const rect = viewport.getBoundingClientRect()
          const midpoint = window.innerHeight / 2
          return rect.top <= midpoint && rect.bottom >= midpoint
        }

        function navigate(direction) {
          if (!roomIsActive()) return false

          // The invitation is the final stop for this visit. Re-entering the
          // page from Home creates a fresh story; scrolling cannot rewind it.
          if (scene === 5) return true

          // Let normal page scrolling resume before the opening scene.
          if (scene === 0 && direction < 0 && !busy) {
            return false
          }

          if (!busy && Date.now() - lastTransition > 650) {
            const next = Math.max(0, Math.min(5, scene + direction))
            moveTo(next)
          }
          return true
        }

        function navigateHorizontal(direction) {
          if (!roomIsActive()) return false
          if (scene !== 2 && scene !== 3) return false

          if (!busy && Date.now() - lastTransition > 650) {
            if (scene === 2 && direction > 0) moveTo(3)
            if (scene === 3 && direction < 0) moveTo(2)
          }
          return true
        }

        function onWheel(event) {
          if (!roomIsActive()) return
          if (scene === 2 || scene === 3) {
            if (Math.abs(event.deltaX) > 10) {
              if (navigateHorizontal(Math.sign(event.deltaX))) {
                event.preventDefault()
              }
            } else if (scene === 3) {
              const direction = Math.sign(event.deltaY)
              if (direction > 0 && navigate(direction)) event.preventDefault()
              else if (direction < 0) event.preventDefault()
            } else {
              event.preventDefault()
            }
            return
          }
          const direction = Math.sign(event.deltaY)
          if (!direction) return
          if (navigate(direction)) event.preventDefault()
        }

        function onKey(event) {
          if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
          if (scene === 5 && roomIsActive() && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
            event.preventDefault()
            return
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            if (navigateHorizontal(event.key === 'ArrowRight' ? 1 : -1)) {
              event.preventDefault()
            }
            return
          }
          const direction =
            ['ArrowDown', 'PageDown', ' '].includes(event.key) ? 1 :
            ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0

          if (direction && navigate(direction)) event.preventDefault()
        }

        let touchStart = null

        function onTouchStart(event) {
          touchStart = event.touches[0]
            ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
            : null
        }

        function onTouchMove(event) {
          if (touchStart === null || !roomIsActive()) return
          const deltaX = touchStart.x - event.touches[0].clientX
          const deltaY = touchStart.y - event.touches[0].clientY

          if (scene === 2 || scene === 3) {
            if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (navigateHorizontal(Math.sign(deltaX))) event.preventDefault()
              touchStart = null
            } else if (scene === 3 && deltaY > 35) {
              if (navigate(1)) event.preventDefault()
              touchStart = null
            } else {
              event.preventDefault()
            }
            return
          }

          if (Math.abs(deltaY) < 35) {
            if (busy) event.preventDefault()
            return
          }
          if (navigate(Math.sign(deltaY))) event.preventDefault()
          touchStart = null
        }

        window.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('keydown', onKey)
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchmove', onTouchMove, { passive: false })

        cleanupListeners = () => {
          window.removeEventListener('wheel', onWheel)
          window.removeEventListener('keydown', onKey)
          window.removeEventListener('touchstart', onTouchStart)
          window.removeEventListener('touchmove', onTouchMove)
        }
      }, room.parentElement)
    }

    // The mobile mission has its own layout and scrolling.
    // Do not initialize the desktop GSAP experience on mobile.
    if (window.matchMedia('(max-width: 767px)').matches) {
      return
    }

    initializeAnimation()

    return () => {
      cancelled = true
      cleanupListeners()
      if (context) context.revert()
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <div className="parlor-room-viewport">
      <div
        ref={roomRef}
        className="parlor-room-canvas"
        role="img"
        aria-label="An illustrated Victorian parlor with women reading, a settee, a gramophone, and a tea table"
      >
        <img
          className="parlor-room-background"
          src="/mission-room/the%20room.png"
          alt=""
        />

        {layers.map(layer => (
          <img
            key={layer.name}
            className="parlor-room-layer"
            data-layer={
              layer.name === 'Settee and gramophone'
                ? 'settee'
                : layer.name === 'Woman reading The Parlor'
                  ? 'first-woman'
                  : layer.name === 'Woman reading a book'
                  ? 'reading-woman'
                  : layer.name === 'Tea table and chairs'
                ? 'tea-table'
                : undefined
            }
            src={`/mission-room/${encodeURIComponent(layer.file)}`}
            alt=""
            style={{
              left: `${(layer.x / 1536) * 100}%`,
              top: `${(layer.y / 1024) * 100}%`,
              width: `${(layer.w / 1536) * 100}%`,
              height: `${(layer.h / 1024) * 100}%`,
              zIndex:
                layer.name === 'Woman reading The Parlor' ? 4 :
                layer.name.toLowerCase().includes('table') ? 5 : 1,
              filter: layer.name.toLowerCase().includes('table')
                ? 'brightness(0.42)'
                : undefined,
              ...(layer.name === 'Woman reading The Parlor'
                ? { '--character': 'first' }
                : layer.name === 'Woman reading a book'
                  ? { '--character': 'second' }
                  : {}),
            }}
          />
        ))}

        <div className="parlor-room-dimmer" aria-hidden="true" />
      </div>

      

      <div className="parlor-scroll-cue" aria-hidden="true">
        <span>SCROLL TO EXPLORE</span>
        <svg viewBox="0 0 24 36" fill="none">
          <path d="M12 2V31M3 22L12 31L21 22"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="parlor-scroll-cue parlor-story-scroll-cue" aria-hidden="true">
        <span>CONTINUE</span>
        <svg viewBox="0 0 24 36" fill="none">
          <path d="M12 2V31M3 22L12 31L21 22"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <section className="parlor-story-one" aria-label="Our mission introduction">
        <p>
          <span className="parlor-story-line">The world doesn't need another publication</span>
          <span className="parlor-story-line">telling us everything is broken.</span>
        </p>
        <p className="parlor-story-emphasis">We know.</p>
        <p>
          <span className="parlor-story-line">What we need are better questions,</span>
          <span className="parlor-story-line">sharper conversations, and a little more</span>
          <span className="parlor-story-line">imagination about what comes next.</span>
        </p>
      </section>

      <section className="parlor-story-three" aria-label="Beyond the Status Quo">
        <h2>Beyond the Status Quo</h2>
        <p>
          We're an independent magazine exploring the intersections of{' '}
          <span className="parlor-keyword">culture</span>,{' '}
          <span className="parlor-keyword">politics</span>,{' '}
          <span className="parlor-keyword">identity</span>,{' '}
          <span className="parlor-keyword">labor</span>, and{' '}
          <span className="parlor-keyword">power</span>. Through journalism,
          essays, criticism, and conversations, we challenge conventional
          wisdom, question the systems we've inherited, and amplify
          perspectives too often pushed to the margins.
        </p>
        <p>
          From <span className="parlor-keyword">grassroots movements</span> and{' '}
          <span className="parlor-keyword">mutual aid networks</span> to{' '}
          <span className="parlor-keyword">cooperative economies</span> and
          new models of <span className="parlor-keyword">collective care</span>,
          we're particularly interested in the people building alternatives
          to systems that no longer serve us.
        </p>
        <div className="parlor-third-cue parlor-swipe-cue" aria-hidden="true">
          <span>SWIPE TO CONTINUE</span>
          <svg viewBox="0 0 48 24" fill="none">
            <path d="M3 12H43M33 3L43 12L33 21"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"/>
          </svg>
        </div>
      </section>
      <section className="parlor-story-four" aria-label="Our Perspective">
        <h2>Our Perspective</h2>

        <p>
          Our editorial perspective is <span className="parlor-keyword">feminist</span>,{' '}
          <span className="parlor-keyword">intersectional</span>,{' '}
          <span className="parlor-keyword">anticolonial</span>, and critical of systems
          that concentrate wealth and power at the expense of people and the planet.
        </p>

        <p>
          But we're not interested in ideological purity tests or preaching to the converted.
        </p>

        <p>
          We believe in <span className="parlor-keyword">rigorous journalism</span>,{' '}
          <span className="parlor-keyword">intellectual curiosity</span>,{' '}
          <span className="parlor-keyword">thoughtful disagreement</span>, and the
          occasional well-placed swear word.
        </p>

        <p>
          We don't pretend to have all the answers. We'd rather ask{' '}
          <span className="parlor-keyword">better questions</span>.
        </p>

        <div className="parlor-four-back-cue" aria-hidden="true">
          <span>← SWIPE BACK</span>
        </div>

      </section>

      <div className="parlor-four-down-cue" aria-hidden="true">
        <span>SCROLL TO CONTINUE ↓</span>
      </div>

      <section className="parlor-story-five" aria-label="More Than a Seat at the Table">
        <h2>More Than a Seat at the Table</h2>

        <p>
          For too long, the conversation has been dominated by the same voices,
          institutions, and assumptions.
        </p>

        <p>
          We're here to make space for different perspectives, inconvenient truths,
          ambitious ideas, and the people imagining something beyond the status quo.
        </p>

        <p>
          Because we're not simply interested in who gets a seat at the table.
        </p>

        <p className="parlor-five-statement">
          We're interested in who's building an entirely different room.
        </p>

        <div className="parlor-five-down-cue" aria-hidden="true">
          <span>SCROLL TO CONTINUE</span>
          <span className="parlor-five-arrow">↓</span>
        </div>
      </section>

      <section className="parlor-join-overlay" aria-label="Join The Parlor">
        <div className="parlor-join-backdrop" aria-hidden="true" />
        <MissionJoinCard />
      </section>

      <div className="parlor-opening-gradient" aria-hidden="true" />

      <div className="parlor-mission-caption">
        <span className="parlor-mission-label">OUR MISSION</span>
        <h1>A Room of Our Own.<br />With Sharp Furniture.</h1>
        <p>Independent journalism for a world worth reimagining.</p>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');

        .parlor-scroll-cue {
          position: absolute;
          z-index: 8;
          bottom: 4%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.65rem;
          color: #fff8f3;
          opacity: 0;
          pointer-events: none;
          text-shadow: 0 2px 10px rgba(20, 10, 18, 0.8);
        }

        
        .parlor-scroll-cue:not(.parlor-story-scroll-cue) {
          left: 50%;
          right: auto;
          bottom: 4%;
          top: auto;
          width: auto;
          transform: translateX(-50%);
          align-items: center;
          text-align: center;
        }

.parlor-scroll-cue.parlor-story-scroll-cue {
          top: calc(50% + 260px);
          right: 7%;
          bottom: auto;
          left: auto;
          width: min(38%, 520px);
          transform: translateX(-50px);
          align-items: center;
          text-align: center;
        }

        .parlor-scroll-cue span {
          font-family: Georgia, serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          white-space: nowrap;
        }

        .parlor-scroll-cue svg {
          width: 22px;
          height: 36px;
          animation: parlor-arrow-pulse 1.8s ease-in-out infinite;
          filter: drop-shadow(0 2px 5px rgba(20, 10, 18, 0.6));
        }

        @keyframes parlor-arrow-pulse {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.55;
          }
          50% {
            transform: translateY(9px);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .parlor-scroll-cue svg {
            animation: none;
          }
        }

        .parlor-story-one {
          position: absolute;
          z-index: 7;
          top: 50%;
          right: 7%;
          width: min(38%, 520px);
          transform: translateY(-50%);
          opacity: 0;
          visibility: hidden;
          color: #fff8f3;
          font-family: Georgia, serif;
          font-size: clamp(1.15rem, 1.7vw, 1.6rem);
          line-height: 1.65;
          text-shadow: 0 2px 16px rgba(20, 10, 18, 0.85);
          pointer-events: none;
        }

        .parlor-story-one p {
          margin: 0 0 1.25rem;
        }

        .parlor-story-one .parlor-story-line {
          display: block;
          opacity: 0;
        }

        .parlor-story-one .parlor-story-emphasis {
          color: #ffb8d2;
          font-family: 'Alex Brush', cursive;
          font-style: normal;
          font-size: clamp(4.5rem, 7vw, 8rem);
          font-weight: 400;
          line-height: 1.1;
          margin: 1.5rem 0 1.75rem;
          text-shadow: 0 0 16px rgba(255, 175, 210, 0.55);
        }

        .parlor-story-one .parlor-story-emphasis {
          filter: drop-shadow(0 0 0px rgba(255, 175, 210, 0));
        }

        @media (max-width: 767px) {
          .parlor-story-one {
            right: 7%;
            width: 86%;
            font-size: 1rem;
          }
        }

        
        .parlor-story-three {
          position: absolute;
          z-index: 7;
          top: 12%;
          left: 7%;
          width: min(18%, 270px);
          color: #fff8f3;
          font-family: Georgia, serif;
          font-size: clamp(0.92rem, 1.2vw, 1.15rem);
          line-height: 1.6;
          text-shadow: 0 2px 16px rgba(20,10,18,.85);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .parlor-story-three h2 {
          width: 80vw;
          max-width: none;
          white-space: nowrap;
          position: relative;
        
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.5rem, 5vw, 5.5rem);
          font-weight: 400;
          line-height: 1;
          color: #f3b4c8;
          margin: 0 0 1.5rem;
          text-shadow: 0 0 20px rgba(255,175,210,.5);
        }
        .parlor-story-three {
          display: block;
        }
        .parlor-story-three p:first-of-type {
          position: relative;
          top: 145px;
          font-size: 0.88em;
          font-weight: 400;
          line-height: 1.65;
        
          left: -40px;}
        .parlor-story-three p:nth-of-type(2) {
          position: fixed;
          left: 7%;
          bottom: 13%;
          width: 86%;
          max-width: none;
          margin: 0;
          opacity: 0;
          text-align: center;
          line-height: 1.55;
        }
        @media (min-width: 768px) {
          .parlor-story-three p:first-of-type { font-size: 1em; }
          .parlor-story-three p:nth-of-type(2) { font-size: 1.1em; }
        }

        .parlor-third-cue {
          position: fixed;
          right: 7%;
          bottom: 8%;
        }
        .parlor-keyword {
          display: inline;
          font-family: 'Alex Brush', cursive;
          font-size: 1.55em;
          font-weight: 400;
          line-height: 0.85;
          color: #f3b4c8;
          text-shadow:
            0 0 2px rgba(255,255,255,0.35),
            0 0 12px rgba(255,175,210,0.55),
            0 0 24px rgba(255,170,205,0.65);
        }
        .parlor-story-three p {
          margin: 0 0 1.2rem;
        }
        .parlor-third-cue {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: .65rem;
          margin-top: 1.5rem;
          opacity: 0;
        }
        
        .parlor-swipe-cue {
          position: fixed;
          right: 3%;
          bottom: 42%;
          left: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #f3b4c8;
          opacity: 0;
          text-shadow: 0 0 15px rgba(255,175,210,.7);
        }
        .parlor-swipe-cue span {
          font-size: 0.65rem;
          letter-spacing: .18em;
          white-space: nowrap;
        }
        .parlor-swipe-cue svg {
          width: 48px;
          height: 24px;
          animation: parlor-swipe-pulse 1.7s ease-in-out infinite;
        }
        @keyframes parlor-swipe-pulse {
          0%, 100% { transform: translateX(0); opacity: .45; }
          50% { transform: translateX(12px); opacity: 1; }
        }
.parlor-third-cue span {
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .22em;
        }
        .parlor-third-cue svg {
          width: 22px;
          height: 36px;
          animation: parlor-arrow-pulse 1.8s ease-in-out infinite;
        }
        @media (max-width: 767px) {
          .parlor-story-three {
            left: 7%;
            width: 86%;
            top: 7%;
            font-size: 1rem;
          }
        }



        /* Soft cinematic shadow behind the fourth scene's scroll cue */
        .parlor-story-four::after {
          content: '';
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 25vh;
          background: linear-gradient(
            to top,
            rgba(27, 10, 22, 0.85) 0%,
            rgba(27, 10, 22, 0.48) 35%,
            rgba(27, 10, 22, 0.12) 75%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 0;
        }

        .parlor-story-four .parlor-four-down-cue {
          z-index: 2;
        }

        /* FRAME FOUR — OUR PERSPECTIVE */
        .parlor-story-four {
          position: absolute;
          z-index: 8;
          top: 9%;
          right: 5%;
          width: min(34%, 470px);
          color: #fff8f3;
          font-family: Georgia, serif;
          font-size: clamp(0.82rem, 1.05vw, 1.05rem);
          line-height: 1.55;
          text-shadow: 0 2px 16px rgba(20, 10, 18, .9);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .parlor-story-four h2 {
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.2rem, 4.7vw, 5.2rem);
          font-weight: 400;
          line-height: 1;
          color: #f3b4c8;
          margin: 0 0 1.4rem;
          text-shadow: 0 0 20px rgba(255, 175, 210, .55);
        }

        .parlor-story-four p {
          margin: 0 0 1.15rem;
        }

        @media (min-width: 768px) {
          .parlor-story-four p { font-size: 1.12em; }
        }

        .parlor-four-back-cue {
          position: fixed;
          left: 3%;
          top: 46%;
          color: #f3b4c8;
          font-family: Georgia, serif;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .18em;
          text-shadow: 0 0 15px rgba(255, 175, 210, .7);
          opacity: 0;
          white-space: nowrap;
        }

        .parlor-four-down-cue {
          position: absolute;
          left: 50%;
          top: 91%;
          bottom: auto;
          transform: translateX(-50%);
          color: #f3b4c8;
          font-family: Georgia, serif;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .18em;
          text-shadow: 0 0 15px rgba(255, 175, 210, .7);
          opacity: 0;
          white-space: nowrap;
          z-index: 30;
        }

        @media (max-width: 767px) {
          .parlor-story-four {
            top: 7%;
            right: 6%;
            width: 56%;
            font-size: .78rem;
          }

          .parlor-story-four h2 {
            font-size: clamp(2.6rem, 8vw, 4rem);
          }
        }


        /* FRAME FIVE — MORE THAN A SEAT AT THE TABLE */
        .parlor-story-five {
          position: absolute;
          z-index: 8;
          inset: 0;
          color: #fff8f3;
          font-family: Georgia, serif;
          text-align: center;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          text-shadow: 0 2px 18px rgba(20, 10, 18, .9);
        }

        .parlor-story-five h2 {
          position: absolute;
          top: 6%;
          left: 5%;
          width: 90%;
          margin: 0;
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.2rem, 5.2vw, 6rem);
          font-weight: 400;
          line-height: 1;
          color: #f3b4c8;
          text-shadow: 0 0 24px rgba(255, 175, 210, .65);
        }

        .parlor-story-five p {
          position: relative;
          max-width: 760px;
          margin: 0 auto 0.65rem;
          font-size: clamp(.9rem, 1.15vw, 1.2rem);
          line-height: 1.45;
        }

        .parlor-story-five p:first-of-type {
          margin-top: 17vh;
        }

        .parlor-story-five .parlor-five-statement {
          position: absolute;
          top: 43%;
          left: 7%;
          width: 31%;
          max-width: none;
          margin: 0;
          font-family: 'Alex Brush', cursive;
          font-size: clamp(2rem, 2.8vw, 3.5rem);
          line-height: 1.18;
          text-align: left;
          color: #f3b4c8;
          text-shadow: 0 0 22px rgba(255, 175, 210, .7);
        }

        @media (max-width: 767px) {
          .parlor-story-five {
            padding: 0 5%;
          }

          .parlor-story-five h2 {
            font-size: clamp(2.8rem, 9vw, 4.5rem);
          }

          .parlor-story-five p:first-of-type {
            margin-top: 19vh;
          }

          .parlor-story-five .parlor-five-statement {
            top: 51%;
            left: 5%;
            width: 42%;
            font-size: clamp(1.8rem, 5vw, 3rem);
          }
        }

        /* Stationary gradient behind the final scene's scroll cue */
        .parlor-story-five::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 28%;
          background: linear-gradient(
            to top,
            rgba(35, 15, 28, 0.72) 0%,
            rgba(35, 15, 28, 0.38) 35%,
            rgba(35, 15, 28, 0.12) 70%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        .parlor-story-five .parlor-five-down-cue {
          z-index: 30;
        }

        .parlor-five-down-cue {
          position: absolute;
          z-index: 30;
          left: 50%;
          bottom: 5%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          color: #f3b4c8;
          font-family: Georgia, serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          white-space: nowrap;
          text-shadow: 0 0 15px rgba(255,175,210,.7);
          opacity: 0;
          animation: parlor-five-pulse 1.8s ease-in-out infinite;
        }

        .parlor-five-arrow {
          font-size: 1.5rem;
          line-height: 1;
        }

        @keyframes parlor-five-pulse {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, 9px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .parlor-five-down-cue { animation: none; }
        }

        /* Final invitation overlay — initially hidden */
        .parlor-join-overlay {
          position: absolute;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .parlor-join-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(28, 12, 23, 0.68);
        }

        .parlor-join-card {
          position: relative;
          z-index: 1;
          box-sizing: border-box;
          width: min(100%, 760px);
          max-height: 90svh;
          overflow-y: auto;
          padding: clamp(2rem, 5vw, 4rem);
          background: #452532;
          border: 1px solid rgba(243, 180, 200, .55);
          border-radius: 18px;
          box-shadow: 0 25px 90px rgba(10, 4, 9, .55);
          text-align: center;
          color: #fff8f3;
          transform: translateY(65px);
        }

        .parlor-join-eyebrow {
          color: #f3b4c8;
          font: 700 .72rem Georgia, serif;
          letter-spacing: .22em;
        }

        .parlor-join-card h2 {
          margin: 1rem 0;
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.2rem, 6vw, 5.5rem);
          font-weight: 400;
          line-height: 1;
          color: #f3b4c8;
        }

        .parlor-join-invitation {
          font: italic clamp(1.1rem, 2vw, 1.5rem) Georgia, serif;
        }

        .parlor-join-description {
          max-width: 480px;
          margin: 1.5rem auto 2rem;
          font: 1rem/1.7 Georgia, serif;
        }

        .parlor-join-form {
          max-width: 520px;
          margin: auto;
          text-align: left;
        }

        .parlor-join-form label {
          display: block;
          margin-bottom: .7rem;
          font: .8rem Georgia, serif;
        }

        .parlor-join-fields {
          display: flex;
          gap: .75rem;
        }

        .parlor-join-fields input {
          box-sizing: border-box;
          flex: 1;
          min-width: 0;
          padding: 1rem;
          border: 1px solid #d9a8b8;
          border-radius: 6px;
          background: #fff8f3;
          color: #301923;
          font-size: 1rem;
        }

        .parlor-join-success {
          max-width: 520px;
          margin: 1.5rem auto 0;
          padding: 1.5rem;
          border: 1px solid rgba(243,180,200,.5);
          border-radius: 10px;
          background: rgba(255,248,243,.1);
          font-family: Georgia, serif;
          line-height: 1.6;
        }
        .parlor-join-success p { margin-bottom: 0; }
        .parlor-join-error {
          color: #ffd5dc;
          margin-top: .8rem;
          font: .9rem Georgia, serif;
        }
        .parlor-join-login {
          margin: 1.25rem 0 0;
          color: #d8b7c4;
          font: .85rem Georgia, serif;
        }
        .parlor-join-login a {
          color: #f3b4c8;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .parlor-join-fields button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }
        .parlor-join-fields button:not(:disabled) {
          opacity: 1;
          cursor: pointer;
        }

        .parlor-join-fields button {
          padding: 1rem 1.5rem;
          border: 0;
          border-radius: 6px;
          background: #f3b4c8;
          color: #301923;
          font-weight: 700;
          opacity: .65;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .parlor-join-fields { flex-direction: column; }
        }

        .parlor-opening-gradient {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(
            90deg,
            rgba(28, 13, 25, 0.04) 10%,
            rgba(28, 13, 25, 0.48) 45%,
            rgba(28, 13, 25, 0.88) 100%
          );
        }

        .parlor-mission-caption {
          position: absolute;
          z-index: 5;
          top: 50%;
          right: 7%;
          width: min(42%, 590px);
          transform: translateY(-50%);
          color: #fff8f3;
          text-align: left;
          pointer-events: none;
        }

        .parlor-mission-label {
          display: block;
          opacity: 0;
          color: #f3b4c8;
          font-family: Georgia, serif;
          font-size: clamp(0.85rem, 1.1vw, 1.1rem);
          font-weight: 700;
          letter-spacing: 0.24em;
          margin-bottom: 1.25rem;
          text-shadow: 0 2px 12px rgba(35, 15, 25, 0.5);
        }

        .parlor-mission-caption h1 {
          font-family: 'Alex Brush', cursive;
          font-size: clamp(3.5rem, 5.5vw, 6.5rem);
          line-height: 0.95;
          font-weight: 400;
          margin: 0 0 1.5rem;
          opacity: 0;
          filter: blur(12px);
          text-shadow: 0 0 22px rgba(255, 240, 245, 0.55);
        }

        .parlor-mission-caption p {
          font-size: clamp(1rem, 1.3vw, 1.3rem);
          line-height: 1.6;
          margin: 0;
          opacity: 0;
          text-shadow: 0 2px 12px rgba(20, 10, 18, 0.65);
        }

        @media (max-width: 767px) {
          .parlor-mission-caption {
            right: 7%;
            left: 7%;
            top: 50%;
            width: auto;
            text-align: center;
          }

          .parlor-mission-caption h1 {
            font-size: clamp(3rem, 11vw, 5rem);
          }
        }

        .parlor-room-viewport::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 28%;
          background: linear-gradient(
            to top,
            rgba(35, 15, 28, 0.72) 0%,
            rgba(35, 15, 28, 0.38) 35%,
            rgba(35, 15, 28, 0.12) 70%,
            transparent 100%
          );
          pointer-events: nofe;
          z-index: 9;
        }

        .parlor-room-viewport {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          overflow: hidden;
          background: #e9c9cf;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .parlor-room-canvas {
          filter: saturate(0.86);
          position: relative;
          width: max(100vw, 150svh);
          flex: 0 0 auto;
          aspect-ratio: 3 / 2;
          overflow: hidden;
          transform-origin: center center;
        }

        .parlor-room-background {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: fill;
        }

        .parlor-room-dimmer {
          position: absolute;
          inset: 0;
          z-index: 3;
          background: rgba(24, 12, 20, 0.7);
          opacity: 0;
          pointer-events: none;
        }

        .parlor-room-layer {
          position: absolute;
          object-fit: fill;
          pointer-events: none;
        }

        @media (max-width: 767px) {
          .parlor-room-canvas {
            width: 170%;
            max-width: none;
            transform: translateX(-20%);
          }
        }
/* PARLOR MOBILE POLISH — RESPONSIVE SCENES */

        .parlor-room-background {
          filter: saturate(0.76) sepia(0.06) blur(var(--mission-background-blur, 0px));
        }

        @media (max-width: 767px) {
          .parlor-room-viewport {
            height: 100dvh;
            min-height: 100dvh;
          }

          .parlor-room-canvas {
            width: max(100vw, 150dvh);
            max-width: none;
            transform: none;
          }

          .parlor-mission-caption {
            left: 6%;
            right: 6%;
            width: 88%;
          }

          .parlor-mission-caption h1 {
            font-size: clamp(2.5rem, 10vw, 4.5rem);
          }

          .parlor-mission-caption p {
            font-size: clamp(.82rem, 3.3vw, 1rem);
            line-height: 1.45;
          }

          .parlor-story-one {
            left: 7%;
            right: 7%;
            width: 86%;
            font-size: clamp(.78rem, 3.3vw, 1rem);
            line-height: 1.45;
          }

          .parlor-story-one p {
            margin-bottom: .75rem;
          }

          .parlor-story-one .parlor-story-emphasis {
            font-size: clamp(3rem, 12vw, 5rem);
            margin: .6rem 0;
          }

          .parlor-story-three {
            top: 7%;
            left: 6%;
            width: 88%;
            font-size: clamp(.78rem, 3vw, .95rem);
            line-height: 1.45;
          }

          .parlor-story-three h2 {
            width: 100%;
            white-space: normal;
            font-size: clamp(2.5rem, 9vw, 4rem);
            margin-bottom: .75rem;
          }

          .parlor-story-three p:first-of-type {
            top: 0;
            left: 0;
            max-width: 75%;
          }

          .parlor-story-three p:nth-of-type(2) {
            left: 6%;
            width: 88%;
            bottom: 12%;
            font-size: clamp(.76rem, 3vw, .95rem);
          }

          .parlor-story-four {
            top: 7%;
            left: 6%;
            right: 6%;
            width: 88%;
            font-size: clamp(.75rem, 2.9vw, .95rem);
            line-height: 1.45;
          }

          .parlor-story-four h2 {
            font-size: clamp(2.4rem, 9vw, 4rem);
            margin-bottom: .75rem;
          }

          .parlor-story-four p {
            margin-bottom: .7rem;
          }

          .parlor-story-five {
            padding: 0 6%;
          }

          .parlor-story-five h2 {
            top: 6%;
            left: 6%;
            width: 88%;
            font-size: clamp(2.3rem, 8.5vw, 4rem);
          }

          .parlor-story-five p {
            font-size: clamp(.76rem, 3vw, .95rem);
            line-height: 1.4;
          }

          .parlor-story-five p:first-of-type {
            margin-top: 22dvh;
          }

          .parlor-story-five .parlor-five-statement {
            top: 55%;
            left: 6%;
            width: 65%;
            font-size: clamp(1.7rem, 6vw, 2.8rem);
          }
        }

        @media (max-width: 767px) and (max-height: 700px) {
          .parlor-story-one {
            font-size: .78rem;
          }

          .parlor-story-four {
            font-size: .75rem;
          }

          .parlor-story-five p:first-of-type {
            margin-top: 19dvh;
          }

          .parlor-story-five .parlor-five-statement {
            top: 58%;
          }
        }
    
      `}</style>

      <style jsx>{`
        /* Pulsating navigation cue for Our Perspective */
        .parlor-four-down-cue {
          position: absolute;
          z-index: 12;
          top: 85%;
          bottom: auto;
          left: 50%;
          transform: translateX(-50%);
          color: #f3b4c8;
          font-family: Georgia, serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          white-space: nowrap;
          text-shadow: 0 0 14px rgba(255,175,210,.75);
          pointer-events: none;
          animation: parlor-down-pulse 1.8s ease-in-out infinite;
        }

        @keyframes parlor-down-pulse {
          0%, 100% {
            transform: translate(-50%, 0);
            filter: brightness(1);
          }
          50% {
            transform: translate(-50%, 9px);
            filter: brightness(1.5);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .parlor-four-down-cue {
            animation: none;
          }
        }


        
      `}</style>
    </div>
  )
}
