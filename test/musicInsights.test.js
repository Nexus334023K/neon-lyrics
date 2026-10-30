const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { InsightsStorage } = require('../src/insights/InsightsStorage');
const { MetricsAggregator } = require('../src/insights/MetricsAggregator');

test('InsightsStorage tracks listening time and track completions accurately', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-insights-'));
  const filePath = path.join(tmpDir, 'insights.json');

  const storage = new InsightsStorage({ filePath });
  const track1 = { title: 'Neon Lights', artist: 'Kraftwerk' };
  const track2 = { title: 'Midnight City', artist: 'M83' };

  // Record 120 seconds for track 1
  storage.recordListening(track1, 120);
  storage.recordTrackCompletion(track1);

  // Record 60 seconds for track 2
  storage.recordListening(track2, 60);

  const data = storage.getData();
  assert.strictEqual(data.totalSecondsListened, 180);
  assert.strictEqual(data.songStats['kraftwerk - neon lights'].plays, 1);
  assert.strictEqual(data.songStats['kraftwerk - neon lights'].seconds, 120);
  assert.strictEqual(data.artistStats['kraftwerk'].plays, 1);
  assert.strictEqual(data.sessions.length, 1);

  // Reload from disk to verify persistence
  const reloaded = new InsightsStorage({ filePath });
  assert.strictEqual(reloaded.getData().totalSecondsListened, 180);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('MetricsAggregator computes top songs, daily activity, and listening streaks', () => {
  const mockData = {
    totalSecondsListened: 7200, // 2 hours
    dailyStats: {
      '2026-10-28': { seconds: 1200, plays: 4 },
      '2026-10-29': { seconds: 2400, plays: 8 },
      '2026-10-30': { seconds: 3600, plays: 12 }
    },
    songStats: {
      'artist a - song 1': { artist: 'Artist A', title: 'Song 1', plays: 15, seconds: 3000 },
      'artist b - song 2': { artist: 'Artist B', title: 'Song 2', plays: 8, seconds: 2000 }
    },
    artistStats: {
      'artist a': { artist: 'Artist A', plays: 15, seconds: 3000 },
      'artist b': { artist: 'Artist B', plays: 8, seconds: 2000 }
    }
  };

  const agg = new MetricsAggregator(mockData);

  // Total hours
  assert.strictEqual(agg.getTotalHours(), 2.0);

  // Top songs
  const topSongs = agg.getTopSongs(5);
  assert.strictEqual(topSongs.length, 2);
  assert.strictEqual(topSongs[0].title, 'Song 1');

  // Top artists
  const topArtists = agg.getTopArtists(5);
  assert.strictEqual(topArtists[0].artist, 'Artist A');

  // Streak on 2026-10-30: 3 consecutive days (28, 29, 30)
  const streak = agg.getCurrentStreak(new Date('2026-10-30T12:00:00Z'));
  assert.strictEqual(streak, 3);

  // Personal recap
  const recap = agg.getPersonalRecap();
  assert.strictEqual(recap.topSong.title, 'Song 1');
  assert.strictEqual(recap.totalHours, 2.0);

  // Milestones
  const milestones = agg.checkMilestones();
  assert.ok(milestones.some(m => m.id === 'first_track'));
  assert.ok(milestones.some(m => m.id === 'hours_1'));
  assert.ok(milestones.some(m => m.id === 'streak_3'));
});

