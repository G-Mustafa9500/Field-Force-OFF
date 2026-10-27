import { useRef, useState, useEffect, useCallback } from "react";

const SAMPLE_INTERVAL = 200;
const STABLE_FRAMES   = 8;
const DIFF_THRESHOLD  = 18;
const FACE_MIN_SKIN   = 0.08;

const isSkin = (r, g, b) =>
  r > 60 && g > 30 && b > 15 && r > g && r > b &&
  (r - Math.min(g, b)) > 10 && Math.abs(r - g) < 55;

export default function LiveCamera({ onCapture, onClose, title = "Live Photo Lo" }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const overlayRef  = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);
  const prevPixels  = useRef(null);
  const stableCount = useRef(0);

  const [ready,    setReady]    = useState(false);
  const [error,    setError]    = useState("");
  const [preview,  setPreview]  = useState(null);
  const [progress, setProgress] = useState(0);
  const [faceOk,   setFaceOk]   = useState(false);
  const [captured, setCaptured] = useState(false);
  const [faceMsg,  setFaceMsg]  = useState("");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current          = stream;
      videoRef.current.srcObject = stream;
      setReady(true);
    } catch (err) {
      if (err.name === "NotAllowedError") setError("Camera permission deny hai. Browser settings mein allow karo.");
      else if (err.name === "NotFoundError") setError("Camera nahi mila device pe.");
      else setError(`Camera error: ${err.message}`);
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
  }, []);

  useEffect(() => { startCamera(); return () => stopStream(); }, []); // eslint-disable-line

  const drawGuide = useCallback((ctx, w, h, faceDetected, prog) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 - h * 0.03;
    const rx = w * 0.26, ry = h * 0.38;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = faceDetected ? "#22c55e" : "rgba(255,255,255,0.7)";
    ctx.lineWidth   = 3;
    ctx.stroke();

    if (prog > 0) {
      const angle = (prog / 100) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy - ry - 18, 16, -Math.PI / 2, angle);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth   = 4;
      ctx.lineCap     = "round";
      ctx.stroke();
    }

    ctx.fillStyle = faceDetected ? "#86efac" : "rgba(255,255,255,0.85)";
    ctx.font      = `${Math.max(13, w * 0.03)}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      faceDetected ? (prog > 0 ? `Hold still... ${Math.round(prog)}%` : "Bilkul still raho") : "Apna chehra oval mein laao",
      cx, cy + ry + 28
    );
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font      = `${Math.max(11, w * 0.022)}px sans-serif`;
    ctx.fillText("Sirf live camera — gallery band", cx, h - 12);
  }, []);

  const analyzeFrame = useCallback(() => {
    const video   = videoRef.current;
    const canvas  = canvasRef.current;
    const overlay = overlayRef.current;
    if (!video || !canvas || !overlay || video.readyState < 2) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw; canvas.height = vh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, vw, vh);

    const sx = Math.floor(vw * 0.3), sy = Math.floor(vh * 0.2);
    const sw = Math.floor(vw * 0.4), sh = Math.floor(vh * 0.55);
    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const pixels  = imgData.data;

    let skinPx = 0, total = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (isSkin(pixels[i], pixels[i+1], pixels[i+2])) skinPx++;
      total++;
    }
    const face = skinPx / total > FACE_MIN_SKIN;
    setFaceOk(face);

    if (prevPixels.current && face) {
      const prev = prevPixels.current;
      let diff = 0, n = 0;
      for (let i = 0; i < pixels.length; i += 4 * 16) {
        diff += Math.abs(pixels[i]-prev[i]) + Math.abs(pixels[i+1]-prev[i+1]) + Math.abs(pixels[i+2]-prev[i+2]);
        n++;
      }
      if (diff/n < DIFF_THRESHOLD) stableCount.current += 1;
      else stableCount.current = Math.max(0, stableCount.current - 2);
    } else if (!face) { stableCount.current = 0; }

    prevPixels.current = new Uint8ClampedArray(pixels);
    const prog = Math.min(100, Math.round((stableCount.current / STABLE_FRAMES) * 100));
    setProgress(prog);

    const octx = overlay.getContext("2d");
    overlay.width  = overlay.clientWidth  || vw;
    overlay.height = overlay.clientHeight || vh;
    drawGuide(octx, overlay.width, overlay.height, face, prog);

    if (stableCount.current >= STABLE_FRAMES && !captured) {
      setCaptured(true);
      doCapture();
    }
  }, [captured, drawGuide]); // eslint-disable-line

  useEffect(() => {
    if (!ready) return;
    intervalRef.current = setInterval(analyzeFrame, SAMPLE_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [ready, analyzeFrame]);

  const doCapture = useCallback(() => {
    clearInterval(intervalRef.current);
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.88);
    stopStream();
    setPreview(base64);
  }, [stopStream]);

  // FIX: Manual capture requires faceOk
  const handleManual = () => {
    if (preview) return;
    if (!faceOk) {
      setFaceMsg("Pehle apna chehra oval mein laao phir capture karo");
      setTimeout(() => setFaceMsg(""), 2500);
      return;
    }
    setCaptured(true);
    doCapture();
  };

  const retake = () => {
    setCaptured(false); setPreview(null);
    stableCount.current = 0; prevPixels.current = null;
    setProgress(0); setFaceOk(false); setFaceMsg("");
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <span className="text-white font-semibold text-sm">{title}</span>
        <button onClick={() => { stopStream(); onClose(); }}
          className="text-gray-300 text-sm px-3 py-1.5 rounded-xl border border-gray-700">Cancel</button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black">
        {error ? (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div><div className="text-5xl mb-4">📵</div><p className="text-red-400 text-sm">{error}</p></div>
          </div>
        ) : preview ? (
          <div className="flex items-center justify-center h-full">
            <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
            <div className="absolute top-4 left-0 right-0 text-center">
              <span className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">✅ Photo li gayi!</span>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />
            <div className="absolute top-3 left-0 right-0 flex justify-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${faceOk ? "bg-green-500/80 text-white" : "bg-black/60 text-gray-300"}`}>
                <span className={`w-2 h-2 rounded-full ${faceOk ? "bg-white animate-pulse" : "bg-gray-500"}`} />
                {faceOk ? "Chehra detect hua ✓" : "Chehra nahin dikh raha"}
              </div>
            </div>
            {progress > 0 && (
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <div className="h-1.5 w-32 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-white text-xs mt-1.5 font-medium">Still raho... {Math.round(progress)}%</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {faceMsg && (
        <div className="bg-red-600 text-white text-center text-xs py-2 px-4 flex-shrink-0 font-medium">
          ⚠️ {faceMsg}
        </div>
      )}

      <div className="px-4 py-4 bg-black flex gap-3 flex-shrink-0">
        {preview ? (
          <>
            <button onClick={retake} className="flex-1 py-3.5 rounded-2xl bg-gray-800 text-white font-medium text-sm">🔄 Dobara Lo</button>
            <button onClick={() => onCapture(preview)} className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-bold text-sm">✅ Use Karo</button>
          </>
        ) : (
          <button onClick={handleManual} disabled={!ready}
            className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
              !ready ? "bg-gray-800 text-gray-500 cursor-not-allowed" :
              faceOk ? "bg-green-500 text-white" : "bg-white/20 text-white border border-white/30"
            }`}>
            {!ready ? "Camera khul raha hai..." : faceOk ? "📸 Abhi Capture Karo" : "📸 Manual (Chehra Dikhao)"}
          </button>
        )}
      </div>

      {!preview && ready && (
        <div className="bg-black pb-3 text-center flex-shrink-0">
          <p className="text-gray-500 text-xs">
            {faceOk ? "⚡ Auto-capture: bilkul still raho" : "💡 Chehra oval mein laao — auto capture ho ga"}
          </p>
        </div>
      )}
    </div>
  );
}
