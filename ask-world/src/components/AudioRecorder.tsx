// src/components/AudioRecorder.tsx
'use client';

import { MiniKit, Permission } from '@worldcoin/minikit-js';
import { RequestPermissionPayload } from '@worldcoin/minikit-js';
import { useState, useRef } from 'react';

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean>(false);

    // Request microphone permission
    const requestMicrophonePermission = async () => {
        const requestPermissionPayload: RequestPermissionPayload = {
            permission: Permission.Microphone,
        };

        const payload = await MiniKit.commandsAsync.requestPermission(requestPermissionPayload);
        if (payload.finalPayload.status === 'success') {
            console.log('Microphone permission granted');
            setHasMicrophonePermission(true);
        } else {
            console.error('Failed to request microphone permission:', payload);
            setHasMicrophonePermission(false);
        }
    };

    // Check existing permissions
    const checkPermissions = async () => {
        const payload = await MiniKit.commandsAsync.getPermissions();
        if (payload.finalPayload.status === 'success') {
            const hasPermission = payload.finalPayload.permissions.microphone;
            setHasMicrophonePermission(hasPermission);
            console.log('Microphone permission:', hasPermission ? 'Granted' : 'Not granted');
        } else {
            console.error('Failed to check permissions:', payload);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setUploadStatus('');
        } catch (error) {
            setUploadStatus('Failed to access microphone: ' + (error as Error).message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleUpload = async () => {
        if (!audioBlob) {
            setUploadStatus('No recording to upload.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUploadStatus('Upload successful!');
                setAudioBlob(null);
            } else {
                setUploadStatus('Upload failed. Try again.');
            }
        } catch (error) {
            setUploadStatus('Error uploading recording: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Record Audio</h1>
            <div className="flex space-x-4 mb-4">
                <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className="bg-red-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                    {isRecording ? 'Recording...' : 'Start Recording'}
                </button>
                <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                    Stop Recording
                </button>
            </div>
            {audioBlob && (
                <div className="mb-4">
                    <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                </div>
            )}
            {uploadStatus && <p className="text-red-500 mb-4">{uploadStatus}</p>}
            <button
                onClick={handleUpload}
                disabled={!audioBlob || uploading}
                className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
                {uploading ? 'Uploading...' : 'Upload Recording'}
            </button>
        </div>
    );
}