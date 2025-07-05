import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RotateCcw, Save, Trash2 } from "lucide-react";
import { PermissionHandler } from "@/components/PermissionHandler";
import { VideoSuccessModal } from "@/components/VideoSuccessModal";
import { BrandedLoader } from "@/components/BrandedLoader";

interface VideoRecorderProps {
  onSave: (videoBlob: Blob, prompt?: string) => void;
  onDiscard: () => void;
  selectedPrompt?: string;
}

export function VideoRecorder({ onSave, onDiscard, selectedPrompt }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const handlePlay = () => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        alert('Unable to play video.');
      });
    } else {
      alert('No video available to play.');
    }
  };

  useEffect(() => {
    // Initialize camera when component mounts
    initializeCamera();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    setIsInitializing(true);
    await startCamera();
    setIsInitializing(false);
  };

  const startCamera = async () => {
    try {
      console.log('Initializing camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setStream(mediaStream);
      setPermissionDenied(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      console.log('Camera initialized successfully');
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Check if it's a permission error
      if (error instanceof DOMException && 
          (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
        setPermissionDenied(true);
      } else {
        // Other errors (no camera, etc.) - use mock mode
        setIsMockMode(true);
        startMockCamera();
      }
    }
  };

  const startMockCamera = () => {
    console.log('Starting mock camera mode');
    if (videoRef.current) {
      // Show a placeholder for mock recording
      videoRef.current.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
      videoRef.current.style.display = 'flex';
      videoRef.current.style.alignItems = 'center';
      videoRef.current.style.justifyContent = 'center';
    }
  };

  const createMockVideoBlob = () => {
    // Create a simple mock video blob for testing
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a simple gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some text
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Mock Recording', canvas.width / 2, canvas.height / 2);
      ctx.fillText(`Duration: ${formatTime(recordingTime)}`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/png');
    });
  };

  const startRecording = async () => {
    console.log('Starting recording...');
    
    let currentStream = stream;
    if (!currentStream) {
      console.log('No stream available, initializing camera...');
      await startCamera();
      // We need to wait for the stream to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      currentStream = stream;
      if (!currentStream) {
        console.error('Failed to initialize camera');
        return;
      }
    }

    try {
      // Reset chunks state
      const chunks: Blob[] = [];
      setRecordedChunks([]);
      
      mediaRecorder.current = new MediaRecorder(currentStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.current.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('Total chunks now:', chunks.length);
        }
      };

      mediaRecorder.current.onstop = () => {
        console.log('Recording stopped, final chunks:', chunks.length);
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log('Created blob with size:', blob.size);
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          setRecordedChunks(chunks);
          
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.load();
          }
          setHasRecording(true);
          console.log('Recording setup complete, hasRecording set to true');
        } else {
          console.error('No chunks recorded!');
          setHasRecording(false);
        }
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start recording with timeslice to ensure data is captured
      mediaRecorder.current.start(1000); // Capture data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setHasRecording(false);
      console.log('Recording started with timeslice');
      
      // 30-second timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsMockMode(true);
      startMockCamera();
    }
  };

  const pauseRecording = () => {
    if (!isMockMode && mediaRecorder.current && isRecording) {
      if (isPaused) {
        mediaRecorder.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 30) {
              stopRecording();
              return 30;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        mediaRecorder.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    mediaRecorder.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    console.log('Resetting recording...');
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setHasRecording(false);
    setVideoUrl(null);
    setRecordedChunks([]);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Restart camera for new recording
    startCamera();
  };

  const handleSave = () => {
    console.log('Save clicked, recordedChunks length:', recordedChunks.length);
    if (recordedChunks.length === 0) {
      setErrorMessage('No video recorded to save.');
      setShowErrorModal(true);
      return;
    }
    
    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      console.log('Calling onSave with blob size:', blob.size);
      setShowSuccessModal(true);
      
      // Delay the actual save to show success animation
      setTimeout(() => {
        onSave(blob, selectedPrompt);
      }, 1500);
    } catch (error) {
      console.error('Error creating video blob:', error);
      setErrorMessage('Failed to process your video. Please try recording again.');
      setShowErrorModal(true);
    }
  };

  const discardRecording = () => {
    setHasRecording(false);
    setVideoUrl(null);
    setRecordedChunks([]);
    onDiscard();
    if (isMockMode) {
      startMockCamera();
    } else {
      startCamera(); // Restart camera for new recording
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePermissionGranted = () => {
    setPermissionDenied(false);
    initializeCamera();
  };

  const handleSkipRecording = () => {
    setPermissionDenied(false);
    onDiscard();
  };

  // Show permission handler if permissions denied
  if (permissionDenied) {
    return (
      <PermissionHandler
        onPermissionGranted={handlePermissionGranted}
        onSkipForNow={handleSkipRecording}
        permissionType="both"
      />
    );
  }

  // Show loader during initialization
  if (isInitializing) {
    return (
      <BrandedLoader
        isVisible={true}
        messages={[
          "Setting up your camera…",
          "Preparing for your special moment…",
          "Creating the perfect recording space…"
        ]}
      />
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Video Preview */}
      <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border relative">
        {isMockMode && !hasRecording ? (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-lg font-semibold mb-2">Mock Camera Mode</div>
              <div className="text-sm opacity-80">Camera not available - using mock recording</div>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted={!hasRecording}
            playsInline
            controls={hasRecording}
          />
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4">
            <div className="inline-flex items-center space-x-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-warm-pulse"></div>
              <span className="font-mono text-sm">{formatTime(recordingTime)}/00:30</span>
            </div>
          </div>
        )}

        {/* Time Limit Warning */}
        {recordingTime >= 25 && isRecording && (
          <div className="absolute top-4 right-4">
            <div className="bg-yellow-500/90 text-yellow-50 px-3 py-1 rounded-full text-sm font-medium">
              {30 - recordingTime}s left
            </div>
          </div>
        )}

        {/* Prompt Overlay during recording */}
        {(isRecording || isPaused) && selectedPrompt && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/80 text-white p-3 rounded-lg text-sm backdrop-blur-sm">
              <p className="leading-relaxed">{selectedPrompt}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {!hasRecording ? (
            // Recording Controls
            !isRecording ? (
              <Button
                size="lg"
                variant="legacy"
                onClick={startRecording}
                className="w-[90%] mx-auto h-12"
                aria-label="Start recording your video message"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="lg"
                variant="warm"
                onClick={pauseRecording}
                className="h-12"
                aria-label={isPaused ? "Resume recording" : "Pause recording"}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="h-12"
                aria-label="Stop recording"
              >
                <Square className="w-5 h-5" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={resetRecording}
                className="h-12"
                aria-label="Reset and start new recording"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          )
        ) : (
          // Post-Recording Controls
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              variant="legacy"
              onClick={handleSave}
              className="h-12"
              aria-label="Save this recording"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={handlePlay}
              className="h-12"
              aria-label="Preview your recording"
            >
              <Play className="w-4 h-4 mr-2" />
              Play
            </Button>
            
            <Button
              size="lg"
              variant="destructive"
              onClick={discardRecording}
              className="h-12"
              aria-label="Discard this recording"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Discard
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={resetRecording}
              className="h-12"
              aria-label="Record a new video"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        )}
      </div>

      {hasRecording && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Recording complete ({formatTime(recordingTime)})
          </p>
        </div>
      )}

      {/* Success Modal */}
      <VideoSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title="Memory Captured!"
        message="Your precious moment has been recorded beautifully. It's ready to be saved and shared with those you love."
      />

      {/* Error Modal */}
      <VideoSuccessModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onRetry={() => {
          setShowErrorModal(false);
          if (errorMessage.includes('No video recorded')) {
            // Reset to recording state if no video was recorded
            resetRecording();
          } else {
            // Retry save if it was a processing error
            handleSave();
          }
        }}
        type="error"
        title="Recording Issue"
        message={errorMessage}
      />
    </div>
  );
}