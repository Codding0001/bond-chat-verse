import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceMessage, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = () => {
    if (recordedBlob) {
      onSendVoiceMessage(recordedBlob);
      setRecordedBlob(null);
    }
  };

  const cancelRecording = () => {
    setRecordedBlob(null);
  };

  if (recordedBlob) {
    return (
      <div className="flex items-center space-x-2">
        <audio controls className="flex-1">
          <source src={URL.createObjectURL(recordedBlob)} type="audio/webm" />
        </audio>
        <Button size="sm" onClick={sendVoiceMessage}>
          <Send className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={cancelRecording}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={isRecording ? "destructive" : "outline"}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
    >
      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
};

export default VoiceRecorder;