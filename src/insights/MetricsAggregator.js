/**
 * NeonLyrics - MetricsAggregator
 * Computes listening trends, streaks, top artists/songs, personal recaps, and milestones.
 */

class MetricsAggregator {
  constructor(storageInstance = null) {
    this.storage = storageInstance;
  }

  _getData() {
    if (this.storage && typeof this.storage.getData === 'function') {
      return this.storage.getData();
    }
    return this.storage || {};
  }

  getTotalHours() {
    const data = this._getData();
    const secs = data.totalSecondsListened || 0;
    return Math.round((secs / 3600) * 10) / 10;
  }

  getTopSongs(limit = 10) {
    const data = this._getData();
    const songs = Object.values(data.songStats || {});
    songs.sort((a, b) => (b.plays - a.plays) || (b.seconds - a.seconds));
    return songs.slice(0, limit);
  }

  getTopArtists(limit = 10) {
    const data = this._getData();
    const artists = Object.values(data.artistStats || {});
    artists.sort((a, b) => (b.plays - a.plays) || (b.seconds - a.seconds));
    return artists.slice(0, limit);
  }

  /**
   * Calculates consecutive listening days streak ending today or yesterday.
   */
  getCurrentStreak(referenceDate = new Date()) {
    const data = this._getData();
    const daily = data.dailyStats || {};

    let streak = 0;
    const checkDate = new Date(referenceDate);

    // If no activity today, check if yesterday had activity to continue streak
    const todayKey = checkDate.toISOString().slice(0, 10);
    const hasActivityToday = daily[todayKey] && (daily[todayKey].seconds > 10 || daily[todayKey].plays > 0);

    if (!hasActivityToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateKey = checkDate.toISOString().slice(0, 10);
      const dayData = daily[dateKey];
      if (dayData && (dayData.seconds > 10 || dayData.plays > 0)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Returns daily activity for the last N days.
   */
  getDailyActivity(days = 7, referenceDate = new Date()) {
    const data = this._getData();
    const daily = data.dailyStats || {};
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const stats = daily[key] || { seconds: 0, plays: 0 };
      result.push({
        date: key,
        seconds: stats.seconds,
        minutes: Math.round((stats.seconds / 60) * 10) / 10,
        plays: stats.plays
      });
    }

    return result;
  }

  getPersonalRecap() {
    const topSongs = this.getTopSongs(1);
    const topArtists = this.getTopArtists(1);
    const totalHours = this.getTotalHours();
    const streak = this.getCurrentStreak();

    return {
      topSong: topSongs[0] || null,
      topArtist: topArtists[0] || null,
      totalHours,
      totalMinutes: Math.round(totalHours * 60),
      currentStreak: streak,
      generatedAt: new Date().toISOString()
    };
  }

  checkMilestones() {
    const data = this._getData();
    const totalHours = this.getTotalHours();
    const totalPlays = Object.values(data.songStats || {}).reduce((acc, s) => acc + s.plays, 0);
    const streak = this.getCurrentStreak();

    const milestones = [];

    if (totalPlays >= 1) milestones.push({ id: 'first_track', label: 'First Track Discovered' });
    if (totalPlays >= 50) milestones.push({ id: 'plays_50', label: '50 Songs Played' });
    if (totalPlays >= 100) milestones.push({ id: 'plays_100', label: '100 Songs Century Club' });

    if (totalHours >= 1) milestones.push({ id: 'hours_1', label: '1 Hour of Music' });
    if (totalHours >= 10) milestones.push({ id: 'hours_10', label: '10 Hours Audiophile' });
    if (totalHours >= 50) milestones.push({ id: 'hours_50', label: '50 Hours Veteran' });

    if (streak >= 3) milestones.push({ id: 'streak_3', label: '3-Day Listening Streak' });
    if (streak >= 7) milestones.push({ id: 'streak_7', label: 'Full Week Groove (7 Days)' });

    return milestones;
  }

  exportDataJson() {
    return JSON.stringify(this._getData(), null, 2);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MetricsAggregator };
}
if (typeof window !== 'undefined') {
  window.MetricsAggregator = MetricsAggregator;
}

