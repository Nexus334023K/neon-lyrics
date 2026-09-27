"""
Media Worker for Electron App
Streams playback metadata and synced lyrics as JSON lines over stdout.
"""

import asyncio
import json
import time
import os
import re
import sys
import urllib.request
import urllib.parse
import datetime

# LRCLIB & Lyrics Parser
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lyrics_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
failed_cache = set()

def sanitize(text):
    return re.sub(r'[<>:"/\\|?*]', '_', text).strip()

def clean_track_title(title):
    cleaned = re.sub(r'\(.*?(feat|ft|remaster|version|deluxe|live|edit).*?\)', '', title, flags=re.IGNORECASE)
    cleaned = re.sub(r'\[.*?(feat|ft|remaster|version|deluxe|live|edit).*?\]', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'-.*?(remaster|live|edit|deluxe).*$', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def add_timing(plain_text):
    if not plain_text:
        return ""
    lines = [l.strip() for l in plain_text.split('\n') if l.strip()]
    result = []
    t = 0.0
    for line in lines:
        mm = int(t // 60)
        ss = int(t % 60)
        result.append(f"[{mm:02d}:{ss:02d}.00] {line}")
        t += 4.0
    return '\n'.join(result)

def fetch_lyrics(artist, title, duration=0):
    track_key = f"{artist} - {title}".strip()
    if not track_key or track_key == "-":
        return None

    cache_file = os.path.join(CACHE_DIR, f"{sanitize(track_key)}.lrc")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception:
            pass

    if track_key in failed_cache:
        return None

    clean_t = clean_track_title(title)
    params = {'artist_name': artist, 'track_name': clean_t}
    if duration > 0:
        params['duration'] = int(duration)
    
    url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'NeonLyrics-Electron/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            lrc = data.get('syncedLyrics') or add_timing(data.get('plainLyrics'))
            if lrc:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    f.write(lrc)
                return lrc
    except Exception:
        pass

    # Search fallback
    try:
        q_url = f"https://lrclib.net/api/search?{urllib.parse.urlencode({'q': f'{artist} {clean_t}'})}"
        req = urllib.request.Request(q_url, headers={'User-Agent': 'NeonLyrics-Electron/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            results = json.loads(resp.read().decode('utf-8'))
            if results and isinstance(results, list) and len(results) > 0:
                for item in results:
                    if item.get('syncedLyrics'):
                        with open(cache_file, 'w', encoding='utf-8') as f:
                            f.write(item['syncedLyrics'])
                        return item['syncedLyrics']
                if results[0].get('plainLyrics'):
                    lrc = add_timing(results[0]['plainLyrics'])
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        f.write(lrc)
                    return lrc
    except Exception:
        pass

    failed_cache.add(track_key)
    return None

def parse_lrc(lrc_text):
    if not lrc_text:
        return []
    lines = []
    offset = 0.0

    for raw_line in lrc_text.split('\n'):
        raw_line = raw_line.strip()
        if not raw_line or re.match(r'\[[a-zA-Z]{2,6}:.*\]', raw_line):
            continue

        ts_m = re.match(r'\[(\d+):(\d+)(?:\.(\d+))?\](.*)', raw_line)
        if not ts_m:
            continue

        mm, ss, ms_str, rest = ts_m.groups()
        line_time = int(mm) * 60 + int(ss) + (float(f"0.{ms_str}") if ms_str else 0.0) + offset
        rest = rest.strip()
        if not rest:
            continue

        word_matches = re.findall(r'<(\d+):(\d+)(?:\.(\d+))?>\s*([^<]*)', rest)
        words = []
        if word_matches:
            for wm, ws, wms, wtext in word_matches:
                wtext = wtext.strip()
                if wtext:
                    wt = int(wm) * 60 + int(ws) + (float(f"0.{wms}") if wms else 0.0) + offset
                    words.append({"time": round(wt, 3), "endTime": round(wt + 0.5, 3), "word": wtext})
            for idx in range(len(words)):
                if idx < len(words) - 1:
                    words[idx]["endTime"] = words[idx + 1]["time"]
                else:
                    words[idx]["endTime"] = words[idx]["time"] + 1.2
        else:
            clean_text = re.sub(r'\[.*?\]', '', rest).strip()
            for token in clean_text.split():
                words.append({"time": 0.0, "endTime": 0.0, "word": token, "simulated": True})

        if words:
            lines.append({
                "time": round(line_time, 3),
                "endTime": 0.0,
                "text": ' '.join(w["word"] for w in words),
                "words": words
            })

    lines.sort(key=lambda x: x["time"])
    for i in range(len(lines)):
        next_t = lines[i + 1]["time"] if i < len(lines) - 1 else lines[i]["time"] + 4.5
        lines[i]["endTime"] = round(next_t, 3)
        duration = max(0.5, next_t - lines[i]["time"])
        if lines[i]["words"] and lines[i]["words"][0].get("simulated"):
            num_words = len(lines[i]["words"])
            word_dur = duration / num_words
            for j, w in enumerate(lines[i]["words"]):
                w["time"] = round(lines[i]["time"] + j * word_dur, 3)
                w["endTime"] = round(lines[i]["time"] + (j + 1) * word_dur, 3)

    return lines


async def run_worker():
    from winsdk.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus
    )

    session_manager = await SessionManager.request_async()
    current_track_key = ""
    current_lyrics_parsed = []

    while True:
        try:
            session = session_manager.get_current_session()
            if not session or session.get_playback_info().playback_status != PlaybackStatus.PLAYING:
                for s in session_manager.get_sessions():
                    try:
                        if s.get_playback_info().playback_status == PlaybackStatus.PLAYING:
                            session = s
                            break
                    except Exception:
                        pass

            if session:
                props = await session.try_get_media_properties_async()
                title = props.title or ""
                artist = props.artist or ""
                album = props.album_title or ""

                playback = session.get_playback_info()
                timeline = session.get_timeline_properties()

                is_playing = playback.playback_status == PlaybackStatus.PLAYING
                state = "playing" if is_playing else ("paused" if playback.playback_status == PlaybackStatus.PAUSED else "stopped")

                raw_pos = timeline.position.total_seconds() if timeline.position else 0.0
                duration = timeline.end_time.total_seconds() if timeline.end_time else 0.0

                if is_playing and timeline.last_updated_time:
                    now_utc = datetime.datetime.now(datetime.timezone.utc)
                    delta = (now_utc - timeline.last_updated_time).total_seconds()
                    position = min(raw_pos + max(0.0, delta), duration if duration > 0 else raw_pos + max(0.0, delta))
                else:
                    position = raw_pos

                track_key = f"{artist} - {title}".strip()
                if track_key != current_track_key and title:
                    current_track_key = track_key
                    lrc = fetch_lyrics(artist, title, duration)
                    current_lyrics_parsed = parse_lrc(lrc) if lrc else []

                payload = {
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "position": round(position, 3),
                    "duration": round(duration, 3),
                    "state": state,
                    "lyrics": current_lyrics_parsed
                }
            else:
                payload = {
                    "title": "", "artist": "", "album": "",
                    "position": 0.0, "duration": 0.0, "state": "stopped",
                    "lyrics": []
                }

            # Output JSON line
            sys.stdout.write(json.dumps(payload) + "\n")
            sys.stdout.flush()

        except Exception as e:
            pass

        await asyncio.sleep(0.05)


if __name__ == "__main__":
    asyncio.run(run_worker())
