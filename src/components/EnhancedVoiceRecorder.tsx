import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, Trash2, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedVoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const EnhancedVoiceRecorder: React.FC<EnhancedVoiceRecorderProps> = ({ 
  onSendVoiceMessage, 
  onCancel, 
  disabled 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopAllTimers();
      cleanupStream();
    };
  }, []);

  const stopAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(audioBlob);
        setDuration(recordingTime);
        cleanupStream();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopAllTimers();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob);
      resetRecorder();
    }
  };

  const resetRecorder = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setIsPlaying(false);
    setPlaybackTime(0);
    setDuration(0);
    stopAllTimers();
    cleanupStream();
    chunksRef.current = [];
  };

  const cancelRecording = () => {
    resetRecorder();
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const createAudio = () => {
    if (audioBlob && !audioRef.current) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      
      audio.onplay = () => {
        setIsPlaying(true);
        playbackTimerRef.current = setInterval(() => {
          setPlaybackTime(Math.floor(audio.currentTime));
        }, 100);
      };
      
      audio.onpause = () => {
        setIsPlaying(false);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      };
    }
  };

  useEffect(() => {
    if (audioBlob) {
      createAudio();
    }
  }, [audioBlob]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Voice Message</h3>
          
          {/* Recording/Playback visualization */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="flex space-x-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isRecording && !isPaused 
                      ? 'bg-red-500 animate-pulse h-8' 
                      : 'bg-muted h-2'
                  }`}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    height: isRecording && !isPaused ? `${Math.random() * 32 + 8}px` : '8px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-2xl font-mono mb-4">
            {formatTime(audioBlob ? playbackTime : recordingTime)}
            {audioBlob && duration > 0 && ` / ${formatTime(duration)}`}
          </div>

          {/* Status */}
          <p className="text-sm text-muted-foreground mb-4">
            {isRecording 
              ? (isPaused ? 'Recording paused' : 'Recording...') 
              : audioBlob 
                ? 'Tap play to review' 
                : 'Tap and hold to record'
            }
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!audioBlob ? (
            <>
              {/* Record button */}
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="rounded-full w-16 h-16"
                onMouseDown={!isRecording ? startRecording : undefined}
                onMouseUp={isRecording ? stopRecording : undefined}
                onTouchStart={!isRecording ? startRecording : undefined}
                onTouchEnd={isRecording ? stopRecording : undefined}
                disabled={disabled}
              >
                {isRecording ? (
                  isPaused ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>

              {/* Pause button (only show when recording) */}
              {isRecording && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pauseRecording}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
              )}

              {/* Cancel button */}
              <Button
                size="sm"
                variant="outline"
                onClick={cancelRecording}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* Play button */}
              <Button
                size="lg"
                variant="outline"
                className="rounded-full w-12 h-12"
                onClick={playRecording}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              {/* Send button */}
              <Button
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={sendVoiceMessage}
              >
                <Send className="w-5 h-5" />
              </Button>

              {/* Delete button */}
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-12 h-12"
                onClick={resetRecorder}
              >
                <Trash2 className="w-5 h-5" />
              </Button>

              {/* Cancel button */}
              <Button
                size="sm"
                variant="outline"
                onClick={cancelRecording}
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {!audioBlob && !isRecording && "Hold the microphone button to record"}
          {isRecording && "Release to stop recording"}
          {audioBlob && "Review your message and tap send"}
        </div>
      </div>
    </div>
  );
};

export default EnhancedVoiceRecorder;