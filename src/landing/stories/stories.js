// The Jutud player: the library and the reading view of the one story, with the paragraph
// being read marked as the audio plays. story.json and story.m4a come from khe-bunny-tales'
// scripts/demo.py; the paragraph starts are seconds into the audio.

const STORY_DATA = '/stories/story.json';
const STORY_HASH = '#kabi-padja-all';
const ARTWORK = '/stories/icon-512.png';

function clock(seconds) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export async function startStories(copy) {
  const body = document.body;
  const audio = document.querySelector('[data-story-audio]');
  const seek = document.querySelector('[data-player-seek]');
  const fill = document.querySelector('[data-player-fill]');
  const elapsed = document.querySelector('[data-player-elapsed]');
  const left = document.querySelector('[data-player-left]');
  const total = document.querySelector('[data-player-total]');
  const playButton = document.querySelector('[data-player-play]');
  const text = (key) => (copy[document.documentElement.lang] ?? copy.et)[key];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // A refused play() (no AAC support, or a pause right after) leaves the button on play, as the
  // pause event never came; nothing else to do.
  const play = () => audio.play().catch(() => {});

  const response = await fetch(STORY_DATA);
  if (!response.ok) throw new Error(`${STORY_DATA}: ${response.status}`);
  const story = await response.json();
  let duration = story.duration;

  document.querySelectorAll('[data-story-title]').forEach((node) => { node.textContent = story.title; });
  const starts = story.paragraphs.map(({ start }) => start);
  const paragraphs = story.paragraphs.map(({ text: words, start }) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = words;
    paragraph.addEventListener('click', () => {
      audio.currentTime = start;
      play();
    });
    return paragraph;
  });
  document.querySelector('[data-story-text]').replaceChildren(...paragraphs);

  function showLabels() {
    const n = String(Math.round(duration / 60));
    document.querySelectorAll('[data-story-length]').forEach((node) => { node.textContent = text('minutes').replace('{n}', n); });
    document.querySelectorAll('[data-story-length-short]').forEach((node) => { node.textContent = text('minutesShort').replace('{n}', n); });
    showPlayLabel();
  }

  function showPlayLabel() {
    playButton.setAttribute('aria-label', text(audio.paused ? 'play' : 'pause'));
  }

  let current = -1;
  function showTime() {
    const time = audio.currentTime;
    seek.value = String(Math.round(time));
    seek.setAttribute('aria-valuetext', `${clock(time)} / ${clock(duration)}`);
    fill.style.transform = `scaleX(${duration ? Math.min(1, time / duration) : 0})`;
    elapsed.textContent = clock(time);
    left.textContent = `−${clock(duration - time)}`;

    if (!body.hasAttribute('data-started')) return;
    let index = 0;
    while (index + 1 < starts.length && starts[index + 1] <= time) index += 1;
    if (index === current) return;
    current = index;
    paragraphs.forEach((paragraph, i) => {
      paragraph.classList.toggle('is-current', i === index);
    });
    if (!audio.paused) {
      paragraphs[index].scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function showDuration() {
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    seek.max = String(Math.ceil(duration));
    total.textContent = clock(duration);
    showLabels();
    showTime();
  }

  function skip(seconds) {
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + seconds), duration);
  }

  audio.addEventListener('play', () => {
    body.setAttribute('data-started', '');
    body.setAttribute('data-playing', '');
    showPlayLabel();
    showTime();
  });
  audio.addEventListener('pause', () => {
    body.removeAttribute('data-playing');
    showPlayLabel();
  });
  audio.addEventListener('timeupdate', showTime);
  audio.addEventListener('loadedmetadata', showDuration);

  playButton.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
  document.querySelectorAll('[data-player-skip]').forEach((button) => {
    button.addEventListener('click', () => skip(Number(button.getAttribute('data-player-skip'))));
  });
  seek.addEventListener('input', () => { audio.currentTime = Number(seek.value); });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: story.title,
      artist: 'Jänkujutud',
      album: 'Jutud',
      artwork: [{ src: ARTWORK, sizes: '512x512', type: 'image/png' }],
    });
    const actions = {
      play,
      pause: () => audio.pause(),
      seekbackward: (details) => skip(-(details.seekOffset || 15)),
      seekforward: (details) => skip(details.seekOffset || 15),
      seekto: (details) => { audio.currentTime = details.seekTime; },
    };
    for (const [action, handler] of Object.entries(actions)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // A browser that does not know the action throws; the others still work.
      }
    }
  }

  // The phone shows one view at a time; from 960px both stand side by side and the hash only
  // says which story is open.
  // The query the library had when the story was opened from it, or null. Going back through
  // history is right only while it is unchanged: a language switch in between rewrites ?lang
  // in place, and the entry behind holds the old language.
  let openedFrom = null;
  function showView() {
    const view = window.location.hash === STORY_HASH ? 'story' : 'library';
    if (body.getAttribute('data-view') === view) return;
    body.setAttribute('data-view', view);
    if (view === 'library') openedFrom = null;
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-story-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      openedFrom = window.location.hash === STORY_HASH ? null : window.location.search;
      play();
    });
  });
  document.querySelectorAll('[data-story-close]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (openedFrom === window.location.search) {
        window.history.back();
      } else {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        showView();
      }
    });
  });
  // Going back may change ?lang as well as the hash, and then only popstate fires.
  window.addEventListener('hashchange', showView);
  window.addEventListener('popstate', showView);

  new MutationObserver(showLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  showView();
  showDuration();
}
