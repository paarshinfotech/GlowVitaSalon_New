import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

class NotificationManager {
  constructor() {
    this.messaging = null;
    this.audioContext = null;
    this.listeners = []; // SUPPORT MULTIPLE LISTENERS!

    if (typeof window !== 'undefined') {
      window.playTestSound = () => this.playNotificationSound();

      try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        this.messaging = getMessaging(app);

        const triggerSound = (payload) => {
          console.log('[NotificationManager] SIGNAL!', payload);
          this.playNotificationSound();

          // BROADCAST to all active components (Toast, Bell Icon, etc.)
          this.listeners.forEach(callback => {
            try { callback(payload); } catch (e) { console.error('Listener Error:', e); }
          });
        };

        const soundChannel = new BroadcastChannel('notification_sound_channel');
        soundChannel.onmessage = (event) => {
          if (event.data?.type === 'PLAY_SOUND') {
            triggerSound(event.data.payload || { from: 'SW_DIRECT' });
          }
        };

        onMessage(this.messaging, (payload) => {
          triggerSound(payload);
        });

        const initAudio = async () => {
          if (!this.audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.audioContext = new AudioCtx();
          }
          if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('[Audio] System Ready');
          }
        };

        ['click', 'keydown', 'touchstart', 'mousedown'].forEach(evt =>
          window.addEventListener(evt, initAudio, { passive: true })
        );

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/api/firebase-messaging-sw', { scope: '/' })
            .then(() => console.log('[System] Service Ready'));
        }
      } catch (err) {
        console.error('[NotificationManager] Init error:', err);
      }
    }
  }

  async playNotificationSound() {
    console.log('[Sound] Playing beep...');
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();

      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.start(now); osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(660, now + 0.25);
      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.start(now + 0.25); osc2.stop(now + 0.8);
    } catch (err) {
      console.error('[Audio] Beep Error:', err);
    }
  }

  // ADD TO THE BROADCAST LIST
  onMessageListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    // Return a function to remove the listener later if needed
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async requestPermission() {
    try {
      if (!this.messaging) return null;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/api/firebase-messaging-sw'),
        });
        if (token) {
          this.currentToken = token;
          await this.saveTokenToServer(token);
          return token;
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
    return null;
  }

  async saveTokenToServer(token) {
    try {
      const endpoint = '/api/client/notifications/register-token';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) console.log('[NotificationManager] Registration Success');
    } catch (error) {
      console.error('API Error:', error);
    }
  }
}

export default new NotificationManager();
