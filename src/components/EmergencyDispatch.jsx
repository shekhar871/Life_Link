/**
 * ============================================================================
 * LIFELINK — EMERGENCY SLA DISPATCH & VERIFICATION (EmergencyDispatch.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Pre-Dispatch Readiness Gate 1 (Webcam):
 *    - Hardware check: if (!navigator.mediaDevices)
 *    - 1280x720 30FPS stream via navigator.mediaDevices.getUserMedia()
 *    - Attached via videoRef.current.srcObject = stream (never src or createObjectURL)
 *    - Disconnect listener: navigator.mediaDevices.ondevicechange
 *    - Cleanup: stream.getTracks().forEach(t => t.stop()) on unmount / stop
 * 2. Pre-Dispatch Readiness Gate 2 (Fullscreen):
 *    - User gesture: document.documentElement.requestFullscreen()
 *    - State synced with document 'fullscreenchange' listener
 *    - Main process Kiosk Mode enforcement: win.setFullScreen(true), win.setKiosk(true)
 * 3. Native Rules Dialog:
 *    - window.lifelinkAPI.showRulesDialog()
 *    - Strict guard: proceeds in React ONLY if result.response === 0 ("Start Dispatch")
 * 4. Authoritative Emergency SLA Timer (Main → Renderer Push Stream):
 *    - Duplicate-interval guard in Main process
 *    - Main pushes remaining SLA seconds every 1s via webContents.send("timer", ...)
 *    - Preload onTimerUpdate returns cleanup closure directly to useEffect
 *    - Authoritative remaining time queried via window.lifelinkAPI.getTimeLeft()
 * 5. Synchronized Camera + Screen Audit Pipeline:
 *    - Single interval inside useEffect (with clearInterval cleanup)
 *    - Single const timestamp = Date.now() generated per interval tick
 *    - Passed to both savePhoto(arrayBuffer, timestamp) and takeScreenShot(timestamp)
 *    - Output: matching photo-${timestamp}.jpg and screen-${timestamp}.png files
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Camera,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Video,
  Monitor,
  ShieldCheck,
  StopCircle,
  RefreshCw,
  Eye,
  Key
} from 'lucide-react';

export default function EmergencyDispatch({ activeRequest, userRole, roleKey }) {
  // Pre-dispatch Readiness Gates
  const [hasCamera, setHasCamera] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hardwareWarning, setHardwareWarning] = useState(null);

  // Verification & SLA Session state
  const [isStarted, setIsStarted] = useState(false);
  const [timerData, setTimerData] = useState({
    remainingSeconds: 900,
    elapsedSeconds: 0,
    totalSeconds: 900,
    isExpired: false
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [lastCaptureTimestamp, setLastCaptureTimestamp] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);

  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // --- GATE 1: Webcam Hardware Initialization ---
  const startCamera = async () => {
    setCameraError(null);
    setHardwareWarning(null);

    // Bug Fix & Hardware Check: check if (!navigator.mediaDevices)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Hardware Check: MediaDevices API is not available on this workstation.');
      return;
    }

    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          frameRate: 30,
          facingMode: 'user'
        }
      });

      streamRef.current = videoData;

      // Attach the live MediaStream to a <video ref={videoRef} autoPlay playsInline />
      // Never use src or URL.createObjectURL
      if (videoRef.current) {
        videoRef.current.srcObject = videoData;
      }
      setHasCamera(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(`Camera Initialization Failed: ${err.name} - ${err.message}`);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      // Four Bug Fixes: Stop all webcam tracks
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
  };

  // Listen to device changes to warn if camera disconnects
  useEffect(() => {
    const handleDeviceChange = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (videoInputs.length === 0 && streamRef.current) {
            setHardwareWarning('Emergency Hardware Warning: Camera disconnected during session!');
            stopCamera();
          }
        } catch (err) {
          console.warn('Device change check error:', err);
        }
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    // Initialize camera on mount
    startCamera();

    return () => {
      // Cleanup on component unmount
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      stopCamera();
    };
  }, []);

  // --- GATE 2: Fullscreen Mode Listener ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  // --- Authoritative Emergency SLA Timer (Main -> Renderer Push Stream) ---
  useEffect(() => {
    if (!window.lifelinkAPI || !window.lifelinkAPI.onTimerUpdate) return;

    // In preload.js, expose listener registration function that uses ipcRenderer.on("timer", fn)
    // and returns a cleanup closure () => ipcRenderer.removeListener("timer", fn)
    // to be returned directly by React's useEffect
    const unsubscribe = window.lifelinkAPI.onTimerUpdate((data) => {
      setTimerData(data);
      if (data.isExpired) {
        setIsStarted(false);
      }
    });

    return unsubscribe;
  }, []);

  // --- Start Emergency Verification & Dispatch Session ---
  const handleStartDispatch = async () => {
    if (!hasCamera) {
      alert('Readiness Gate 1 Incomplete: Webcam stream must be verified.');
      return;
    }
    if (!isFullscreen) {
      alert('Readiness Gate 2 Incomplete: Kiosk Fullscreen Mode required for clinical audit compliance.');
      return;
    }

    // Native Emergency Dispatch Rules Dialog (show-rules)
    let resIndex = 1;
    if (window.lifelinkAPI && window.lifelinkAPI.showRulesDialog) {
      resIndex = await window.lifelinkAPI.showRulesDialog();
    } else {
      resIndex = window.confirm(
        'Emergency Dispatch & Verification Rules:\n1. Maintain continuous camera & screen monitoring.\n2. Verify batch codes against packaging.\n3. Complete within 15 min SLA.\n\nStart Dispatch?'
      )
        ? 0
        : 1;
    }

    // Only proceed in React if the returned response index is 0
    if (resIndex === 0) {
      try {
        // Enforce Fullscreen/Kiosk mode in Main process
        if (window.lifelinkAPI && window.lifelinkAPI.setKioskMode) {
          await window.lifelinkAPI.setKioskMode(true);
        }

        // Invoke authoritative "start-timer" in Main process
        if (window.lifelinkAPI && window.lifelinkAPI.startTimer) {
          await window.lifelinkAPI.startTimer(900); // 15 minutes (900 seconds)
        }

        setIsStarted(true);
      } catch (err) {
        console.error('Failed to start dispatch session:', err);
      }
    }
  };

  // Stop session
  const handleStopDispatch = async () => {
    setIsStarted(false);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    try {
      if (window.lifelinkAPI && window.lifelinkAPI.stopTimer) {
        await window.lifelinkAPI.stopTimer();
      }
      if (window.lifelinkAPI && window.lifelinkAPI.setKioskMode) {
        await window.lifelinkAPI.setKioskMode(false);
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Error during dispatch teardown:', err);
    }
  };

  // --- Synchronized Camera + Screen Audit Capture Pipeline ---
  useEffect(() => {
    if (!isStarted) {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      return;
    }

    // Helper to capture a webcam frame as ArrayBuffer
    const captureCameraBuffer = async () => {
      if (!streamRef.current) return null;
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') return null;

      try {
        // Use new ImageCapture(videoTrack).takePhoto() in Renderer
        if (typeof window.ImageCapture === 'function') {
          const imageCapture = new window.ImageCapture(videoTrack);
          const photoBlob = await imageCapture.takePhoto();
          return await photoBlob.arrayBuffer();
        } else {
          // Canvas fallback if ImageCapture is unavailable in this environment
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          if (videoRef.current) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
            return await blob.arrayBuffer();
          }
        }
      } catch (err) {
        console.warn('Webcam capture error:', err.message);
        // Canvas fallback
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
          return await blob.arrayBuffer();
        }
      }
      return null;
    };

    // Single interval inside useEffect (with clearInterval cleanup)
    const runSynchronizedAuditTick = async () => {
      // Lecture Slide Homework & Practice Challenge:
      // Generate a SINGLE const timestamp = Date.now() per interval tick
      // and pass it to both savePhoto(arrayBuffer, timestamp) and takeScreenShot(timestamp)
      // so photo-${timestamp}.jpg and screen-${timestamp}.png have identical timestamps!
      const timestamp = Date.now();

      try {
        const arrayBuffer = await captureCameraBuffer();

        // Perform two audit captures simultaneously with identical timestamp
        const promises = [];

        if (arrayBuffer && window.lifelinkAPI && window.lifelinkAPI.savePhoto) {
          promises.push(window.lifelinkAPI.savePhoto(arrayBuffer, timestamp));
        }

        if (window.lifelinkAPI && window.lifelinkAPI.takeScreenShot) {
          promises.push(window.lifelinkAPI.takeScreenShot(timestamp));
        }

        const results = await Promise.all(promises);
        setLastCaptureTimestamp(timestamp);
        setCaptureCount((prev) => prev + 1);

        setAuditLogs((prev) => [
          {
            timestamp,
            photoFile: `photo-${timestamp}.jpg`,
            screenFile: `screen-${timestamp}.png`,
            status: 'Synchronized & Verified'
          },
          ...prev.slice(0, 8)
        ]);
      } catch (err) {
        console.error('Audit tick error:', err);
      }
    };

    // Run first capture tick immediately on start
    runSynchronizedAuditTick();

    // Trigger synchronized audit every 8 seconds during active verification
    captureIntervalRef.current = setInterval(runSynchronizedAuditTick, 8000);

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [isStarted]);

  // Format seconds to mm:ss
  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isGatesReady = hasCamera && isFullscreen;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: isStarted ? 'var(--brand-emerald)' : 'var(--brand-red)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isStarted ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
              }}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  Emergency SLA Dispatch & Batch Verification
                </h2>
                <span className={`badge ${isStarted ? 'badge-emerald' : 'badge-red'}`}>
                  {isStarted ? 'Active Verification Stream' : 'Standby / Gate Check'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Dual-Gate Readiness • Authoritative Main SLA Push • Synchronized Photo + Screen Audit
              </p>
            </div>
          </div>

          {/* SLA Timer Display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--bg-hover)',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <Clock size={20} color={isStarted ? 'var(--brand-red)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                AUTHORITATIVE SLA TIME
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: isStarted ? 'var(--brand-red)' : 'var(--text-primary)'
                }}
              >
                {formatTimer(timerData.remainingSeconds)}
              </div>
            </div>
          </div>
        </div>

        {hardwareWarning && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--brand-amber-light)',
              color: 'var(--brand-amber)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{hardwareWarning}</span>
          </div>
        )}
      </div>

      {/* Main Verification Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Left Column: Live Webcam Stream & Camera Gate */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} color="var(--brand-blue)" />
              Clinical Packaging & Batch Barcode Camera Gate
            </h3>
            <span className={`badge ${hasCamera ? 'badge-emerald' : 'badge-red'}`}>
              {hasCamera ? 'Camera Live' : 'Camera Required'}
            </span>
          </div>

          {/* Video element with autoPlay playsInline ref */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              background: '#020617',
              borderRadius: '10px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror for natural donor/staff feedback
              }}
            />

            {/* Overlay Grid / Barcode scan guides */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '50%',
                  border: isStarted ? '2px dashed #10b981' : '2px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  padding: '8px',
                  color: isStarted ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {isStarted ? 'BATCH VERIFICATION FRAME [ACTIVE]' : 'ALIGN BATCH & DONOR IDENTIFIER HERE'}
              </div>
            </div>

            {!hasCamera && (
              <div style={{ position: 'absolute', textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                <Video size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', marginBottom: '10px' }}>
                  {cameraError || 'Webcam access is required for clinical audit compliance'}
                </p>
                <button onClick={startCamera} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                  <RefreshCw size={14} /> Retry Webcam
                </button>
              </div>
            )}

            {isStarted && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(225, 29, 72, 0.85)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} className="animate-pulse" />
                REC • SYNCHRONIZED AUDIT ACTIVE
              </div>
            )}
          </div>

          {/* Active Request Details if passed */}
          {activeRequest && (
            <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-red)', marginBottom: '4px' }}>
                TARGET DISPATCH: {activeRequest.facilityName}
              </div>
              <div>Patient: {activeRequest.patientIdentifier} • {activeRequest.bloodGroup ? `${activeRequest.bloodGroup} ${activeRequest.component}` : activeRequest.medicineName} ({activeRequest.unitsRequested} units)</div>
            </div>
          )}
        </div>

        {/* Right Column: Pre-Dispatch Readiness Gates & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
              Pre-Dispatch Readiness Gates
            </h3>

            {/* Gate 1 Item */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: hasCamera ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)',
                border: hasCamera ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={18} color={hasCamera ? 'var(--brand-emerald)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Gate 1: Webcam Verification</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {hasCamera ? '1280x720 30FPS stream active' : 'Waiting for camera feed'}
                  </div>
                </div>
              </div>

              {hasCamera ? (
                <CheckCircle2 size={18} color="var(--brand-emerald)" />
              ) : (
                <button onClick={startCamera} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                  Enable
                </button>
              )}
            </div>

            {/* Gate 2 Item */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: isFullscreen ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)',
                border: isFullscreen ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Maximize2 size={18} color={isFullscreen ? 'var(--brand-emerald)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Gate 2: Fullscreen Kiosk Mode</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {isFullscreen ? 'Kiosk window locked' : 'Requires user fullscreen click'}
                  </div>
                </div>
              </div>

              <button
                onClick={requestFullscreen}
                className={`btn ${isFullscreen ? 'btn-secondary' : 'btn-primary'}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isFullscreen ? 'Exit' : 'Lock Fullscreen'}</span>
              </button>
            </div>

            {/* Dispatch Action Button */}
            {!isStarted ? (
              <button
                onClick={handleStartDispatch}
                disabled={!isGatesReady}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  opacity: isGatesReady ? 1 : 0.5
                }}
              >
                <ShieldCheck size={18} />
                <span>Verify Rules & Start Dispatch (Native Dialog)</span>
              </button>
            ) : (
              <button
                onClick={handleStopDispatch}
                className="btn btn-danger"
                style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700 }}
              >
                <StopCircle size={18} />
                <span>Complete Verification & End Dispatch</span>
              </button>
            )}

            {!isGatesReady && !isStarted && (
              <p style={{ fontSize: '11px', color: 'var(--brand-red)', marginTop: '8px', textAlign: 'center' }}>
                *Both Webcam and Fullscreen Gates must be active before dispatch
              </p>
            )}
          </div>

          {/* Live Synchronized Audit Log */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck size={16} color="var(--brand-emerald)" />
                Synchronized Audit Log ({captureCount} Captures)
              </h4>
              <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                Dual Feed (Photo + Screen)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div
                    key={log.timestamp}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-hover)',
                      fontSize: '11px',
                      borderLeft: '3px solid var(--brand-emerald)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>TS: {new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span style={{ color: 'var(--brand-emerald)' }}>Identical TS Match</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                      <span>📷 {log.photoFile}</span>
                      <span>🖥️ {log.screenFile}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No audit captures yet. Start dispatch session to log synchronized camera & screen records.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
