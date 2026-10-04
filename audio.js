/* ====================================================================
 * ROYAL DAIFUGO - audio.js
 * [Version: v4.0.0 - 裏画面完全消音・BGMフェード競合根絶＆音響保護版]
 * ==================================================================== */

/* ★最小化・裏画面での完全消音ガードを備えたSoundManager★ */
class SoundManager {
  constructor() {
    this.ctx = null;
    const initAudio = () => {
      this.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);

    const handleSuspend = () => {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    };

    const handleResume = () => {
      if (this.ctx && this.ctx.state === 'suspended' && (typeof isSoundMuted === 'undefined' || !isSoundMuted)) {
        this.ctx.resume().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleSuspend();
      else handleResume();
    });
    window.addEventListener('pagehide', handleSuspend);
    window.addEventListener('blur', () => {
      if (document.hidden) handleSuspend();
    });
    window.addEventListener('focus', () => {
      if (!document.hidden) handleResume();
    });
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !document.hidden && (typeof isSoundMuted === 'undefined' || !isSoundMuted)) {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freqStart, freqEnd, type, duration, gainStart) {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
      gain.gain.setValueAtTime(gainStart, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  playSelect() { this.playTone(440, 880, 'sine', 0.05, 0.15); }
  playDeselect() { this.playTone(660, 330, 'sine', 0.04, 0.1); }
  playPass() { this.playTone(130, 40, 'sawtooth', 0.35, 0.3); }
  playSpade3Return() { this.playTone(1046.5, 261.6, 'square', 0.25, 0.25); }

  playCardPlay() {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  playSpecial() {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    [220, 440, 880].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, null, 'triangle', 0.15, 0.15), idx * 70);
    });
  }

  playWin() {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, null, 'sine', 0.25, 0.15), idx * 80);
    });
  }

  playJoker() {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    [880, 1108.73, 1318.51].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, null, 'triangle', 0.3, 0.18), idx * 60);
    });
  }

  playFanfare(tier = 1) {
    if (document.hidden) return;
    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) return;
    if (tier === 3) {
      [440, 554, 659, 880, 1108, 1318, 1760].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, null, 'triangle', 0.45, 0.25), idx * 110);
      });
    } else if (tier === 2) {
      [440, 554, 659, 880, 1108].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, null, 'triangle', 0.35, 0.2), idx * 100);
      });
    } else {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, null, 'sine', 0.25, 0.18), idx * 90);
      });
    }
  }
}

/* ★排他制御と完全消音ガードを備えたBgmManager（裏画面完全消音・タイマー競合根絶版）★ */
class BgmManager {
  constructor() {
    this.audioA = new Audio();
    this.audioB = new Audio();
    this.audioA.loop = true;
    this.audioB.loop = true;
    this.targetVolume = 0.3;
    this.audioA.volume = 0;
    this.audioB.volume = 0;

    this.activeAudio = this.audioA;
    this.idleAudio = this.audioB;
    this.currentTrack = null;
    this.currentSrc = null;
    this.fadeTimer = null;
    this.isCharSelectPhase = true;
    this.isHeroAdvMode = false;
    this.wasPlayingBeforeHidden = false;
    this.isBackgrounded = false;

    this.currentBattleBaseSrc = 'bgm_normal.mp3';

    this.tracks = {
      charSelect: 'bgm_select.mp3',
      normal: 'bgm_normal.mp3',
      revolution: 'bgm_kakumei.mp3',
      elevenBack: 'bgm_11back.mp3'
    };

    const handleHide = () => {
      this.isBackgrounded = true;
      if (this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }

      const isAnyPlaying = (!this.audioA.paused || !this.audioB.paused);
      if (isAnyPlaying) {
        this.wasPlayingBeforeHidden = true;
      }

      try { this.audioA.pause(); } catch (e) {}
      try { this.audioB.pause(); } catch (e) {}
    };

    const handleShow = () => {
      this.isBackgrounded = false;
      if (this.wasPlayingBeforeHidden && (typeof isSoundMuted === 'undefined' || !isSoundMuted)) {
        this.activeAudio.volume = this.targetVolume;
        this.activeAudio.play().catch(() => {});
      }
      this.wasPlayingBeforeHidden = false;
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleHide();
      else handleShow();
    });
    window.addEventListener('pagehide', handleHide);
    window.addEventListener('blur', () => {
      if (document.hidden) handleHide();
    });
    window.addEventListener('focus', () => {
      if (!document.hidden) handleShow();
    });

    const unlockAudio = () => {
      if (this.isBackgrounded || document.hidden) return;
      if (typeof isSoundMuted === 'undefined' || !isSoundMuted) {
        const src = (this.isCharSelectPhase && !this.isHeroAdvMode) ? this.tracks.charSelect : this.currentBattleBaseSrc;
        if (!this.activeAudio.src || this.currentSrc !== src) {
          this.activeAudio.src = src;
          this.currentSrc = src;
        }
        this.activeAudio.volume = this.targetVolume;
        this.activeAudio.play().then(() => {
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchend', unlockAudio);
        }).catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchend', unlockAudio, { passive: true });
  }

  stopAllImmediate() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    try { this.audioA.pause(); } catch (e) {}
    try { this.audioB.pause(); } catch (e) {}
    this.audioA.currentTime = 0;
    this.audioB.currentTime = 0;
    this.audioA.volume = 0;
    this.audioB.volume = 0;
    this.wasPlayingBeforeHidden = false;
  }

  crossFade(nextSrc, forceRestart = false) {
    if (!nextSrc) return;
    if (this.isBackgrounded || document.hidden) {
      this.currentSrc = nextSrc;
      return;
    }
    if (!forceRestart && this.currentSrc === nextSrc && !this.activeAudio.paused) return;
    this.currentSrc = nextSrc;

    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    if (typeof isSoundMuted !== 'undefined' && isSoundMuted) {
      this.stopAllImmediate();
      this.activeAudio.src = nextSrc;
      return;
    }

    const outgoing = this.activeAudio;
    const incoming = this.idleAudio;

    incoming.src = nextSrc;
    incoming.currentTime = 0;
    incoming.volume = 0;

    const playPromise = incoming.play();

    const startTransition = () => {
      if (this.isBackgrounded || document.hidden) {
        incoming.pause();
        outgoing.pause();
        return;
      }

      const steps = 8;
      const interval = 25;
      let step = 0;
      const startOutVol = outgoing.volume;

      this.fadeTimer = setInterval(() => {
        if (this.isBackgrounded || document.hidden) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
          incoming.pause();
          outgoing.pause();
          return;
        }

        step++;
        const factor = step / steps;
        outgoing.volume = Math.max(0, startOutVol * (1 - factor));
        incoming.volume = Math.min(this.targetVolume, this.targetVolume * factor);

        if (step >= steps) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
          outgoing.pause();
          outgoing.volume = 0;
          incoming.volume = this.targetVolume;

          this.activeAudio = incoming;
          this.idleAudio = outgoing;
        }
      }, interval);
    };

    if (playPromise !== undefined) {
      playPromise.then(startTransition).catch(() => {
        if (!this.isBackgrounded && !document.hidden) {
          incoming.volume = this.targetVolume;
          outgoing.pause();
          this.activeAudio = incoming;
          this.idleAudio = outgoing;
        }
      });
    } else {
      startTransition();
    }
  }

  setBattleBaseSrc(src) {
    this.currentBattleBaseSrc = src || this.tracks.normal;
    this.isHeroAdvMode = false;
    const rev = typeof isRevolution !== 'undefined' ? isRevolution : false;
    const eb = typeof isElevenBack !== 'undefined' ? isElevenBack : false;
    this.update(rev, eb);
  }

  setHeroBaseBgm(heroKey) {
    const heroBgmMaps = {
      NOBUNAGA: 'nobunaga_song.mp3',
      SHOTOKU: 'shotoku_song.mp3',
      SHI_HUANGDI: 'shi_huangdi_song.mp3',
      ALEXANDER: 'alexander_song.mp3',
      GILGAMESH: 'gilgamesh_song.mp3'
    };
    const targetSrc = heroBgmMaps[heroKey] || this.tracks.normal;
    this.currentBattleBaseSrc = targetSrc;
    this.isHeroAdvMode = false;
    this.isCharSelectPhase = false;
    this.crossFade(targetSrc, true);
  }

  playHeroStoryBgm(heroKey) {
    const heroBgmMaps = {
      NOBUNAGA: 'nobunaga_song.mp3',
      SHOTOKU: 'shotoku_song.mp3',
      SHI_HUANGDI: 'shi_huangdi_song.mp3',
      ALEXANDER: 'alexander_song.mp3',
      GILGAMESH: 'gilgamesh_song.mp3'
    };
    const src = heroBgmMaps[heroKey] || 'nobunaga_song.mp3';
    this.currentBattleBaseSrc = src;
    this.isHeroAdvMode = true;
    this.crossFade(src);
  }

  update(isRev, isEb) {
    if (this.isHeroAdvMode) {
      this.crossFade(this.currentBattleBaseSrc);
    } else if (this.isCharSelectPhase) {
      this.crossFade(this.tracks.charSelect);
    } else if (isEb) {
      this.crossFade(this.tracks.elevenBack);
    } else if (isRev) {
      this.crossFade(this.tracks.revolution);
    } else {
      this.crossFade(this.currentBattleBaseSrc);
    }
  }

  setCharSelectPhase(isSelect) {
    this.isCharSelectPhase = isSelect;
    if (isSelect) {
      this.isHeroAdvMode = false;
    }
    const rev = typeof isRevolution !== 'undefined' ? isRevolution : false;
    const eb = typeof isElevenBack !== 'undefined' ? isElevenBack : false;
    this.update(rev, eb);
  }
}

/* グローバルインスタンス生成 */
const soundMgr = new SoundManager();
const bgmMgr = new BgmManager();
