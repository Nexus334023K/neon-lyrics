"""
NeonLyrics v3 - Media Worker
High-performance Windows Media Session (GSMTC) bridge with sub-second timeline extrapolation,
robust error recovery, and low-latency command handling.
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
import threading
import queue
import signal

# Portable Cache Directory
app_data = os.environ.get('APPDATA') or os.path.expanduser('~')
CACHE_DIR = os.path.join(app_data, "NeonLyrics", "lyrics_cache")
try:
    os.makedirs(CACHE_DIR, exist_ok=True)
except Exception:
    CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lyrics_cache")
    os.makedirs(CACHE_DIR, exist_ok=True)

failed_cache = set()
running = True

def sanitize_filename(text):
    return re.sub(r'[<>:"/\\|?*]', '_', text or '').strip()

def clean_track_title(title):
    if not title:
        return ""
    cleaned = re.sub(r'\(.*?(feat|ft|remaster|version|deluxe|live|edit).*?\)', '', title, flags=re.IGNORECASE)
    cleaned = re.sub(r'\[.*?(feat|ft|remaster|version|deluxe|live|edit).*?\]', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'-.*?(remaster|live|edit|deluxe).*$', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def add_timing_fallback(plain_text):
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

    cache_file = os.path.join(CACHE_DIR, f"{sanitize_filename(track_key)}.lrc")
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
        req = urllib.request.Request(url, headers={'User-Agent': 'NeonLyrics-App/3.0'})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            lrc = data.get('syncedLyrics') or add_timing_fallback(data.get('plainLyrics'))
            if lrc:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    f.write(lrc)
                return lrc
    except Exception:
        pass

    # Search fallback
    try:
        q_url = f"https://lrclib.net/api/search?{urllib.parse.urlencode({'q': f'{artist} {clean_t}'})}"
        req = urllib.request.Request(q_url, headers={'User-Agent': 'NeonLyrics-App/3.0'})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            results = json.loads(resp.read().decode('utf-8'))
            if results and isinstance(results, list) and len(results) > 0:
                for item in results:
                    if item.get('syncedLyrics'):
                        with open(cache_file, 'w', encoding='utf-8') as f:
                            f.write(item['syncedLyrics'])
                        return item['syncedLyrics']
                if results[0].get('plainLyrics'):
                    lrc = add_timing_fallback(results[0]['plainLyrics'])
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

    meta_offset = re.search(r'\[offset:([+-]?\d+)\]', lrc_text, re.IGNORECASE)
    if meta_offset:
        try:
            offset = float(meta_offset.group(1)) / 1000.0
        except Exception:
            offset = 0.0

    time_tag_regex = re.compile(r'\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]')

    for raw_line in lrc_text.split('\n'):
        raw_line = raw_line.strip()
        if not raw_line or re.match(r'\[(ti|ar|al|by|offset):.*?\]', raw_line, re.IGNORECASE):
            continue

        matches = list(time_tag_regex.finditer(raw_line))
        if not matches:
            continue

        last_match = matches[-1]
        rest = raw_line[last_match.end():].strip()
        if not rest:
            continue

        is_instrumental = bool(re.match(r'^\s*(\[|\()?(music|instrumental|solo|interlude)(\]|\))?\s*$', rest, re.IGNORECASE) or rest in ('♪', '...'))

        word_matches = list(re.finditer(r'<(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?>\s*([^<]*)', rest))
        raw_words = []
        has_word_timings = bool(word_matches)

        if has_word_timings:
            for wm in word_matches:
                w_m, w_s, w_ms, w_text = wm.groups()
                w_text = w_text.strip()
                if w_text:
                    wt = int(w_m) * 60 + int(w_s) + (float(f"0.{w_ms}") if w_ms else 0.0) + offset
                    raw_words.append({"time": round(wt, 3), "endTime": round(wt + 0.5, 3), "word": w_text, "verified": True})
            for idx in range(len(raw_words)):
                if idx < len(raw_words) - 1:
                    raw_words[idx]["endTime"] = raw_words[idx + 1]["time"]
                else:
                    raw_words[idx]["endTime"] = raw_words[idx]["time"] + 1.2
        else:
            clean_text = re.sub(r'\[.*?\]|<.*?>', '', rest).strip()
            for token in clean_text.split():
                raw_words.append({"time": 0.0, "endTime": 0.0, "word": token, "verified": False})

        for m in matches:
            mm, ss, ms_str = m.groups()
            line_time = int(mm) * 60 + int(ss) + (float(f"0.{ms_str}") if ms_str else 0.0) + offset

            words = []
            if has_word_timings:
                words = [dict(w) for w in raw_words]
            else:
                words = [dict(w, time=round(line_time, 3), endTime=round(line_time, 3)) for w in raw_words]

            display_text = "♪ (Instrumental) ♪" if is_instrumental else (' '.join(w["word"] for w in words) if words else rest)

            lines.append({
                "time": round(max(0.0, line_time), 3),
                "endTime": 0.0,
                "text": display_text,
                "words": words,
                "isInstrumental": is_instrumental,
                "hasWordTimings": has_word_timings
            })

    lines.sort(key=lambda x: x["time"])
    for i in range(len(lines)):
        next_t = lines[i + 1]["time"] if i < len(lines) - 1 else lines[i]["time"] + 4.5
        lines[i]["endTime"] = round(next_t, 3)
        duration = max(0.5, next_t - lines[i]["time"])
        if not lines[i]["hasWordTimings"] and lines[i]["words"]:
            num_words = len(lines[i]["words"])
            word_dur = duration / num_words
            for j, w in enumerate(lines[i]["words"]):
                w["time"] = round(lines[i]["time"] + j * word_dur, 3)
                w["endTime"] = round(lines[i]["time"] + (j + 1) * word_dur, 3)

    return lines


cmd_queue = queue.Queue()

def stdin_reader():
    global running
    while running:
        try:
            line = sys.stdin.readline()
            if not line:
                running = False
                break
            line = line.strip()
            if line:
                data = json.loads(line)
                cmd_queue.put(data)
                if data.get("action") == "quit":
                    running = False
                    break
        except Exception:
            pass

threading.Thread(target=stdin_reader, daemon=True).start()

def signal_handler(sig, frame):
    global running
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


async def run_worker():
    global running
    from winsdk.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus
    )

    try:
        session_manager = await SessionManager.request_async()
    except Exception as e:
        sys.stderr.write(f"Failed to initialize SessionManager: {e}\n")
        sys.stderr.flush()
        return

    current_track_key = ""
    current_lyrics_parsed = []
    last_emitted_key = ""
    last_emitted_state = ""
    last_emitted_pos = -1.0

    while running:
        try:
            # Process incoming control commands from Electron
            while not cmd_queue.empty():
                try:
                    cmd = cmd_queue.get_nowait()
                    action = cmd.get("action")
                    if action == "quit":
                        running = False
                        break

                    active_ctrl_session = session_manager.get_current_session()
                    if not active_ctrl_session:
                        for s in session_manager.get_sessions():
                            active_ctrl_session = s
                            break

                    if active_ctrl_session:
                        if action == "play_pause":
                            await active_ctrl_session.try_toggle_play_pause_async()
                        elif action == "next":
                            await active_ctrl_session.try_skip_next_async()
                        elif action == "prev":
                            await active_ctrl_session.try_skip_previous_async()
                        elif action == "seek" and "position" in cmd:
                            ticks = int(float(cmd["position"]) * 10000000)
                            await active_ctrl_session.try_change_playback_position_async(ticks)
                        elif action == "load_custom_lyrics":
                            custom_lrc = cmd.get("lrcText", "")
                            current_lyrics_parsed = parse_lrc(custom_lrc)
                except Exception:
                    pass

            if not running:
                break

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

            # Emit JSON line
            sys.stdout.write(json.dumps(payload) + "\n")
            sys.stdout.flush()

        except Exception as e:
            pass

        # Adaptive sleep: 100ms when playing, 600ms when paused/stopped
        sleep_time = 0.1 if payload.get("state") == "playing" else 0.6
        await asyncio.sleep(sleep_time)


if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except (KeyboardInterrupt, SystemExit):
        pass
