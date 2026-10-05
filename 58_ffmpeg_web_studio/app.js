// FFmpeg Web Studio Logic
let currentPreset = 'discord';

// DOM Elements
const commandOutput = document.getElementById('commandOutput');
const btnCopy = document.getElementById('btnCopy');
const copyToast = document.getElementById('copyToast');
const inputFile = document.getElementById('inputFile');
const outputFile = document.getElementById('outputFile');
const dynamicSettings = document.getElementById('dynamicSettings');
const explainerList = document.getElementById('explainerList');
const presetButtons = document.querySelectorAll('.preset-btn');

// Preset Configurations
const PRESET_DEFS = {
    discord: {
        defaultOut: 'discord_video.mp4',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Target File Size</label>
                    <select id="discordTargetSize" class="select-box">
                        <option value="10" selected>10 MB (Free Discord Limit)</option>
                        <option value="25">25 MB (Old Nitro Classic)</option>
                        <option value="50">50 MB (Nitro)</option>
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label>Video Duration (Seconds)</label>
                    <input type="number" id="discordDuration" value="30" min="1" max="3600" class="input-text">
                </div>
            </div>
            <div class="form-group">
                <label>Audio Bitrate</label>
                <select id="discordAudioBitrate" class="select-box">
                    <option value="96k">96 kbps (Voice / Low)</option>
                    <option value="128k" selected>128 kbps (Standard Music)</option>
                </select>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'discord_video.mp4';
            const sizeMB = parseFloat(document.getElementById('discordTargetSize')?.value || 10);
            const duration = parseFloat(document.getElementById('discordDuration')?.value || 30);
            const aBitrateStr = document.getElementById('discordAudioBitrate')?.value || '128k';
            const aBitrateNum = parseInt(aBitrateStr);

            // Total target kilobits = sizeMB * 8192
            // Total bitrate kbps = (sizeMB * 8192) / duration
            const totalKbps = Math.floor((sizeMB * 8192 * 0.95) / Math.max(duration, 1)); // 5% safety margin
            const vBitrate = Math.max(50, totalKbps - aBitrateNum);

            const cmd = `ffmpeg -y -i ${inName} -c:v libx264 -b:v ${vBitrate}k -preset slow -pass 1 -an -f null /dev/null && ffmpeg -i ${inName} -c:v libx264 -b:v ${vBitrate}k -preset slow -pass 2 -c:a aac -b:a ${aBitrateStr} ${outName}`;
            
            const explanations = [
                { flag: `-b:v ${vBitrate}k`, desc: `Calculated exact video bitrate based on ${duration}s length to ensure output is under ${sizeMB}MB.` },
                { flag: '-pass 1 & 2', desc: 'Two-pass encoding: First pass analyzes frame complexity, second pass allocates bits perfectly for maximum quality.' },
                { flag: '-c:v libx264', desc: 'Encodes using universal H.264 video codec compatible with all Discord clients.' },
                { flag: `-b:a ${aBitrateStr}`, desc: 'Audio stream bitrate encoded with AAC.' }
            ];
            return { cmd, explanations };
        }
    },

    gif: {
        defaultOut: 'animation.gif',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Target FPS (Smoothness)</label>
                    <select id="gifFps" class="select-box">
                        <option value="12">12 FPS (Lightweight)</option>
                        <option value="15" selected>15 FPS (Balanced Standard)</option>
                        <option value="24">24 FPS (Cinematic / Large File)</option>
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label>Max Width (Scale)</label>
                    <select id="gifWidth" class="select-box">
                        <option value="360">360px (Tiny / Stickers)</option>
                        <option value="480" selected>480px (Standard Web)</option>
                        <option value="720">720px (HD High Quality)</option>
                        <option value="-1">Original Resolution</option>
                    </select>
                </div>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'animation.gif';
            const fps = document.getElementById('gifFps')?.value || '15';
            const width = document.getElementById('gifWidth')?.value || '480';
            const scaleFilter = width === '-1' ? `fps=${fps}` : `fps=${fps},scale=${width}:-1:flags=lanczos`;

            const cmd = `ffmpeg -i ${inName} -vf "${scaleFilter},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 ${outName}`;
            const explanations = [
                { flag: 'palettegen & paletteuse', desc: 'Advanced 2-pass color quantization: Generates a custom 256-color palette for crisp, zero-grain GIF quality.' },
                { flag: `fps=${fps}`, desc: `Caps output framerate to ${fps} FPS to reduce file size.` },
                { flag: 'scale=...:flags=lanczos', desc: 'Resizes using high-fidelity Lanczos resampling.' },
                { flag: '-loop 0', desc: 'Enables infinite looping.' }
            ];
            return { cmd, explanations };
        }
    },

    audio: {
        defaultOut: 'audio.mp3',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Audio Format</label>
                    <select id="audioFormat" class="select-box">
                        <option value="mp3" selected>MP3 (Universal)</option>
                        <option value="wav">WAV (Uncompressed PCM)</option>
                        <option value="aac">AAC (M4A Container)</option>
                        <option value="flac">FLAC (Lossless)</option>
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label>Audio Bitrate / Quality</label>
                    <select id="audioBitrate" class="select-box">
                        <option value="320k" selected>320 kbps (Studio Quality)</option>
                        <option value="192k">192 kbps (Standard High)</option>
                        <option value="128k">128 kbps (Voice / Lightweight)</option>
                    </select>
                </div>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const fmt = document.getElementById('audioFormat')?.value || 'mp3';
            const b = document.getElementById('audioBitrate')?.value || '320k';
            const outName = outputFile.value.trim() || `audio.${fmt === 'aac' ? 'm4a' : fmt}`;

            let codec = 'libmp3lame';
            let extra = `-b:a ${b}`;
            if (fmt === 'wav') { codec = 'pcm_s16le'; extra = ''; }
            else if (fmt === 'flac') { codec = 'flac'; extra = ''; }
            else if (fmt === 'aac') { codec = 'aac'; extra = `-b:a ${b}`; }

            const cmd = `ffmpeg -i ${inName} -vn -c:a ${codec} ${extra} ${outName}`.replace(/\s+/g, ' ');
            const explanations = [
                { flag: '-vn', desc: 'Video Null: Disables the video recording stream completely, saving processing time.' },
                { flag: `-c:a ${codec}`, desc: `Specifies audio encoder codec (${codec}).` },
                { flag: extra, desc: extra ? `Allocates high bit-rate of ${b} for crystal clear audio.` : 'Lossless uncompressed audio container.' }
            ];
            return { cmd, explanations };
        }
    },

    trim: {
        defaultOut: 'trimmed.mp4',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Start Time (HH:MM:SS)</label>
                    <input type="text" id="trimStart" value="00:00:05" class="input-text">
                </div>
                <div class="form-group flex-1">
                    <label>End Time (HH:MM:SS)</label>
                    <input type="text" id="trimEnd" value="00:00:25" class="input-text">
                </div>
            </div>
            <div class="form-group">
                <label>Stream Mode</label>
                <select id="trimMode" class="select-box">
                    <option value="fast" selected>Fast Stream Copy (Sub-second, No Quality Loss)</option>
                    <option value="accurate">Frame-Accurate Re-encode (Exact cut down to individual millisecond)</option>
                </select>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'trimmed.mp4';
            const start = document.getElementById('trimStart')?.value || '00:00:05';
            const end = document.getElementById('trimEnd')?.value || '00:00:25';
            const mode = document.getElementById('trimMode')?.value || 'fast';

            let cmd = '';
            let explanations = [];
            if (mode === 'fast') {
                cmd = `ffmpeg -ss ${start} -to ${end} -i ${inName} -c copy ${outName}`;
                explanations = [
                    { flag: `-ss ${start}`, desc: 'Fast seek: Jumps directly to the nearest keyframe before decoding.' },
                    { flag: `-to ${end}`, desc: 'Stops copying at the target timestamp.' },
                    { flag: '-c copy', desc: 'Direct stream clone: Skips audio/video re-encoding. Finishes in under 1 second with 0 quality loss.' }
                ];
            } else {
                cmd = `ffmpeg -i ${inName} -ss ${start} -to ${end} -c:v libx264 -crf 18 -preset fast -c:a aac ${outName}`;
                explanations = [
                    { flag: `-ss ${start} -to ${end}`, desc: 'Decodes every single video frame to slice at exact frame boundaries.' },
                    { flag: '-crf 18', desc: 'Visually lossless re-encoding quality factor.' }
                ];
            }
            return { cmd, explanations };
        }
    },

    scale: {
        defaultOut: 'scaled.mp4',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Target Resolution</label>
                    <select id="scaleRes" class="select-box">
                        <option value="1920:1080">1080p Full HD (1920x1080)</option>
                        <option value="1280:720" selected>720p HD (1280x720)</option>
                        <option value="854:480">480p SD (854x480)</option>
                        <option value="3840:2160">4K Ultra HD (3840x2160)</option>
                        <option value="1080:1920">9:16 Vertical (TikTok / Reels / Shorts)</option>
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label>Keep Aspect Ratio</label>
                    <select id="scaleRatio" class="select-box">
                        <option value="pad" selected>Pad with Black Bars (No Distortion)</option>
                        <option value="crop">Crop Center (Fill Screen)</option>
                        <option value="stretch">Stretch to Fit</option>
                    </select>
                </div>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'scaled.mp4';
            const res = document.getElementById('scaleRes')?.value || '1280:720';
            const [w, h] = res.split(':');
            const ratio = document.getElementById('scaleRatio')?.value || 'pad';

            let vf = `scale=${w}:${h}`;
            if (ratio === 'pad') {
                vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
            } else if (ratio === 'crop') {
                vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
            }

            const cmd = `ffmpeg -i ${inName} -vf "${vf}" -c:v libx264 -crf 20 -c:a copy ${outName}`;
            const explanations = [
                { flag: `-vf "${vf}"`, desc: `Video filter pipeline: Scales image to ${w}x${h} using ${ratio} mode.` },
                { flag: '-c:v libx264 -crf 20', desc: 'Re-encodes resized video frames with pristine crispness.' },
                { flag: '-c:a copy', desc: 'Transfers audio stream directly without wasting time re-encoding sound.' }
            ];
            return { cmd, explanations };
        }
    },

    speed: {
        defaultOut: 'speed_modified.mp4',
        render: () => `
            <div class="form-group">
                <label>Playback Speed Multiplier</label>
                <select id="speedMultiplier" class="select-box">
                    <option value="0.5">0.5x (Slow Motion 50%)</option>
                    <option value="0.75">0.75x (Slightly Slower)</option>
                    <option value="1.25">1.25x (Podcast Pace)</option>
                    <option value="1.5">1.5x (Fast 150%)</option>
                    <option value="2.0" selected>2.0x (Double Speed)</option>
                </select>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'speed_modified.mp4';
            const speed = parseFloat(document.getElementById('speedMultiplier')?.value || 2.0);
            const pts = (1 / speed).toFixed(4);

            let atempo = `atempo=${speed}`;
            if (speed === 0.5) atempo = 'atempo=0.5';
            else if (speed === 2.0) atempo = 'atempo=2.0';

            const cmd = `ffmpeg -i ${inName} -filter_complex "[0:v]setpts=${pts}*PTS[v];[0:a]${atempo}[a]" -map "[v]" -map "[a]" ${outName}`;
            const explanations = [
                { flag: `setpts=${pts}*PTS`, desc: `Adjusts video presentation timestamps for ${speed}x playback speed.` },
                { flag: atempo, desc: `Adjusts audio tempo to ${speed}x without turning voices into chipmunk squeaks (pitch maintained).` }
            ];
            return { cmd, explanations };
        }
    },

    mute: {
        defaultOut: 'muted.mp4',
        render: () => `
            <p style="color:#94a3b8; font-size:13px; margin-bottom:12px;">Completely strips all audio channels while keeping 100% video stream untouched. Runs at lightning speed (zero re-encoding).</p>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mp4';
            const outName = outputFile.value.trim() || 'muted.mp4';
            const cmd = `ffmpeg -i ${inName} -an -c:v copy ${outName}`;
            const explanations = [
                { flag: '-an', desc: 'Audio Null: Drops all audio streams and metadata.' },
                { flag: '-c:v copy', desc: 'Copies video stream byte-for-byte. Zero rendering time, zero quality loss.' }
            ];
            return { cmd, explanations };
        }
    },

    transcode: {
        defaultOut: 'converted.mp4',
        render: () => `
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Container Format</label>
                    <select id="transFormat" class="select-box">
                        <option value="mp4" selected>MP4 (Most Compatible)</option>
                        <option value="mkv">MKV (Matroska / High Capacity)</option>
                        <option value="webm">WebM (Modern Web VP9)</option>
                        <option value="mov">MOV (Apple QuickTime)</option>
                    </select>
                </div>
                <div class="form-group flex-1">
                    <label>Video Codec</label>
                    <select id="transCodec" class="select-box">
                        <option value="libx264" selected>H.264 (Universal Standard)</option>
                        <option value="libx265">H.265 / HEVC (50% smaller size)</option>
                        <option value="libvpx-vp9">VP9 (Google Web Standard)</option>
                    </select>
                </div>
            </div>
        `,
        generate: () => {
            const inName = inputFile.value.trim() || 'input.mkv';
            const fmt = document.getElementById('transFormat')?.value || 'mp4';
            const codec = document.getElementById('transCodec')?.value || 'libx264';
            const outName = outputFile.value.trim() || `converted.${fmt}`;

            const cmd = `ffmpeg -i ${inName} -c:v ${codec} -crf 22 -preset medium -c:a aac -b:a 192k ${outName}`;
            const explanations = [
                { flag: `-c:v ${codec}`, desc: `Transcodes video stream to ${codec}.` },
                { flag: '-crf 22', desc: 'Constant Rate Factor 22 delivers high subjective quality with optimal compression.' },
                { flag: '-c:a aac', desc: 'Encodes audio with modern AAC standard.' }
            ];
            return { cmd, explanations };
        }
    }
};

// Update Command & UI
function updateCommand() {
    const config = PRESET_DEFS[currentPreset];
    if (!config) return;

    const { cmd, explanations } = config.generate();
    commandOutput.textContent = cmd;

    // Render Explanations
    explainerList.innerHTML = '';
    explanations.forEach(item => {
        const div = document.createElement('div');
        div.className = 'explainer-item';
        div.innerHTML = `<span class="flag-badge">${item.flag}</span> ${item.desc}`;
        explainerList.appendChild(div);
    });
}

// Switch Preset
function selectPreset(presetKey) {
    currentPreset = presetKey;
    presetButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    const config = PRESET_DEFS[presetKey];
    outputFile.value = config.defaultOut;
    dynamicSettings.innerHTML = config.render();

    // Attach listeners to new controls inside dynamicSettings
    dynamicSettings.querySelectorAll('input, select').forEach(elem => {
        elem.addEventListener('input', updateCommand);
        elem.addEventListener('change', updateCommand);
    });

    updateCommand();
}

// Copy to Clipboard
btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(commandOutput.textContent).then(() => {
        copyToast.classList.add('show');
        setTimeout(() => copyToast.classList.remove('show'), 2000);
    });
});

// Donation Copy
function copyDonationEmail() {
    navigator.clipboard.writeText('donate@novafortixlab.com').then(() => {
        alert('Email copied: donate@novafortixlab.com');
    });
}

// Initial Setup
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => selectPreset(btn.dataset.preset));
});
inputFile.addEventListener('input', updateCommand);
outputFile.addEventListener('input', updateCommand);

// Initialize with default
selectPreset('discord');
