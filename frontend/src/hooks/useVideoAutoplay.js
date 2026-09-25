import { useEffect, useRef } from 'react';

// Safari refuses to autoplay the cinemagraphs whenever Low Power Mode is on (and iOS does the
// same on cellular), leaving a static poster with a play badge over it. The markup attributes
// alone can't win that fight, so this hook does three things the attributes don't:
//   1. sets .muted on the element itself - React drops the muted attribute often enough that a
//      video Safari would otherwise allow gets treated as sound-on and blocked;
//   2. calls play() directly, since a rejected promise is the only way to detect the block;
//   3. if it was blocked, retries once on the first user gesture - a gesture re-grants playback
//      even in Low Power Mode, so the loop starts as soon as the visitor touches the page.
export default function useVideoAutoplay() {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Autoplay is only ever permitted for muted media - assert it rather than trusting the attribute.
    video.muted = true;
    video.defaultMuted = true;

    let cleanupGestureListeners = null;

    const attempt = () => {
      const played = video.play();
      // Older Safari returns undefined instead of a promise.
      return played && typeof played.catch === 'function' ? played : Promise.resolve();
    };

    const retryOnGesture = () => {
      const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'];

      const onGesture = () => {
        attempt().catch(() => {});
        cleanup();
      };

      const cleanup = () => {
        events.forEach((evt) => window.removeEventListener(evt, onGesture));
      };

      events.forEach((evt) => window.addEventListener(evt, onGesture, { once: true, passive: true }));
      return cleanup;
    };

    // The very first attempt() can fire before the browser has buffered enough to play at all
    // (independent of any autoplay policy) - retry as more data arrives so a slow load on
    // localhost's dev server doesn't get misread as a policy block.
    const onCanPlay = () => attempt().catch(() => {});
    video.addEventListener('loadeddata', onCanPlay);
    video.addEventListener('canplaythrough', onCanPlay);

    attempt().catch(() => {
      cleanupGestureListeners = retryOnGesture();
    });

    return () => {
      video.removeEventListener('loadeddata', onCanPlay);
      video.removeEventListener('canplaythrough', onCanPlay);
      if (cleanupGestureListeners) cleanupGestureListeners();
    };
  }, []);

  return ref;
}
