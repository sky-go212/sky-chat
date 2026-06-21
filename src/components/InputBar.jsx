import { useState, useRef } from 'react';
import { useMediaCompress } from '../hooks/useMediaCompress.js';

export default function InputBar({ onSend, onTyping, replyTo, onCancelReply, disabled }) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const { compress, compressing } = useMediaCompress();

  const handleSend = () => {
    if (disabled) return;
    if (media) {
      onSend({ type: media.type, file: media.file, caption: text });
      setMedia(null); setPreview(null); setText('');
    } else if (text.trim()) {
      onSend({ type: 'text', content: text.trim() });
      setText('');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'voice';
    const compressed = type === 'image' ? await compress(file, 'image') : file;
    if (!compressed) return;
    const url = URL.createObjectURL(compressed);
    setMedia({ file: compressed, type });
    setPreview({ url, type });
    e.target.value = '';
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current.ondataavailable = e => chunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setMedia({ file, type: 'voice' });
        setPreview({ url: URL.createObjectURL(blob), type: 'voice' });
      };
      mediaRecorder.current.start();
      setRecording(true);
    } catch {}
  };

  const stopRecord = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex-shrink-0" style={{ background: 'rgba(10,10,15,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 px-3 py-1.5 rounded-lg border-l-2 text-sm" style={{ borderColor: '#FF6B9D', background: 'rgba(255,107,157,0.1)' }}>
            <span style={{ color: '#8B8B9E' }}>↩️ Balas: </span>{replyTo.content?.slice(0, 40)}
          </div>
          <button onClick={onCancelReply} className="text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10">✕</button>
        </div>
      )}

      {/* Media preview */}
      {preview && (
        <div className="flex items-center gap-2 px-4 pt-2">
          {preview.type === 'image' && <img src={preview.url} className="h-16 w-16 rounded-lg object-cover" alt="" />}
          {preview.type === 'voice' && <div className="px-3 py-2 rounded-lg glass text-sm">🎤 Voice note siap dikirim</div>}
          {preview.type === 'video' && <video src={preview.url} className="h-16 rounded-lg" />}
          <button onClick={() => { setMedia(null); setPreview(null); }} className="text-lg w-7 h-7 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,71,87,0.2)' }}>✕</button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-3">
        <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'rgba(255,255,255,0.07)' }}>
          📎
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={handleFile} className="hidden" />

        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); onTyping?.(true); }}
            onBlur={() => onTyping?.(false)}
            onKeyDown={handleKey}
            placeholder={media ? 'Tambah keterangan...' : 'Ketik pesan...'}
            rows={1}
            disabled={recording || disabled}
            className="w-full px-4 py-2.5 rounded-xl resize-none text-sm"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              maxHeight: 100,
              lineHeight: 1.5
            }}
          />
        </div>

        {(text.trim() || media) ? (
          <button onClick={handleSend} disabled={compressing || disabled} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 glow-pink disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)' }}>
            {compressing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '➤'}
          </button>
        ) : (
          <button
            onTouchStart={startRecord}
            onTouchEnd={stopRecord}
            onMouseDown={startRecord}
            onMouseUp={stopRecord}
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg transition-all ${recording ? 'animate-recording' : ''}`}
            style={{ background: recording ? '#FF4757' : 'rgba(255,255,255,0.07)' }}
          >
            🎤
          </button>
        )}
      </div>

      {recording && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(255,71,87,0.1)' }}>
          <div className="glass-dark rounded-2xl px-6 py-4 text-center animate-recording">
            <p className="text-2xl mb-1">🔴</p>
            <p className="text-sm font-semibold">Merekam suara...</p>
            <p className="text-xs mt-1" style={{ color: '#8B8B9E' }}>Lepas untuk kirim</p>
          </div>
        </div>
      )}
    </div>
  );
}
