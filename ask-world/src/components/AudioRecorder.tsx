// src/components/AudioRecorder.tsx
'use client';

import { MiniKit, Permission } from '@worldcoin/minikit-js';
import { RequestPermissionPayload } from '@worldcoin/minikit-js';
import { useState, useRef } from 'react';
import Image from 'next/image';

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [blobId, setBlobId] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Detect supported MIME type
    function getSupportedMimeType() {
        const possibleTypes = isSafari()
            ? ['audio/mp4', 'audio/aac']
            : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
        for (const type of possibleTypes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
        }
        // fallback
        return '';
    }

    // Request microphone permission
    const requestMicrophonePermission = async () => {
        const requestPermissionPayload: RequestPermissionPayload = {
            permission: Permission.Microphone,
        };

        const payload = await MiniKit.commandsAsync.requestPermission(requestPermissionPayload);
        if (payload.finalPayload.status === 'success') {
            console.log('Microphone permission granted');
        } else {
            console.error('Failed to request microphone permission:', payload);
        }
    };

    // Check existing permissions
    const checkRequestMicrophonePermission = async () => {
        const payload = await MiniKit.commandsAsync.getPermissions();
        if (payload.finalPayload.status === 'success') {
            const hasPermission = payload.finalPayload.permissions.microphone;
            console.log('Microphone permission:', hasPermission ? 'Granted' : 'Not granted');
            if (!hasPermission) {
                requestMicrophonePermission();
            }
        } else {
            console.error('Failed to check permissions:', payload);
        }
    };

    const startRecording = async () => {
        try {
            checkRequestMicrophonePermission();
            const mimeType = getSupportedMimeType();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
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
        setUploadStatus('Uploading to Walrus...');
        setShowToast(false);
        setBlobId(null);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

            const response = await fetch('/api/upload-walrus', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setUploadStatus(`Upload successful! Blob ID: ${result.blobId}`);
                setBlobId(result.blobId);
                setToastType('success');
                setShowToast(true);
                setAudioBlob(null);
            } else {
                setUploadStatus('Upload failed: ' + (result.error || 'Unknown error'));
                setToastType('error');
                setShowToast(true);
            }
        } catch (error) {
            console.error('Error uploading to Walrus:', error);
            setUploadStatus('Error uploading to Walrus: ' + (error as Error).message);
            setToastType('error');
            setShowToast(true);
        } finally {
            setUploading(false);
        }
    };

    // Toast auto-hide
    if (showToast) {
        setTimeout(() => setShowToast(false), 4000);
    }

    // Copy blobId to clipboard
    const copyBlobId = () => {
        if (blobId) {
            navigator.clipboard.writeText(blobId);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 py-8 px-2">
            <div className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-fade-in">
                <div className="flex flex-col items-center mb-6">
                    <Image src="/globe.svg" alt="Mini World" width={64} height={64} className="mb-2 animate-pop" />
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Mini World</h1>
                    <p className="text-sm text-gray-500 mb-2">Record your voice and store it on Walrus</p>
                </div>
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={startRecording}
                        disabled={isRecording || uploading}
                        className={`transition-all flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold shadow-md bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${isRecording ? 'animate-pulse' : ''}`}
                    >
                        <span role="img" aria-label="record">🎤</span>
                        {isRecording ? 'Recording...' : 'Start Recording'}
                    </button>
                    <button
                        onClick={stopRecording}
                        disabled={!isRecording || uploading}
                        className="transition-all flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold shadow-md bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                    >
                        <span role="img" aria-label="stop">⏹️</span>
                        Stop
                    </button>
                </div>
                {isRecording && (
                    <div className="w-full flex items-center justify-center mb-4">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-2"></div>
                        <span className="text-red-500 font-medium">Recording in progress...</span>
                    </div>
                )}
                {audioBlob && (
                    <div className="mb-6 w-full">
                        <audio controls src={URL.createObjectURL(audioBlob)} className="w-full rounded-lg border border-gray-200 shadow-sm" />
                    </div>
                )}
                {uploadStatus && (
                    <p className={`mb-4 text-center text-base font-medium ${uploadStatus.startsWith('Upload successful') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>
                )}
                <button
                    onClick={handleUpload}
                    disabled={!audioBlob || uploading}
                    className="transition-all flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold shadow-md bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 mb-2"
                >
                    <span role="img" aria-label="upload">⬆️</span>
                    {uploading ? 'Uploading...' : 'Upload to Walrus'}
                </button>
                {/* Toast for upload result */}
                {showToast && (
                    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} animate-fade-in`}>
                        {toastType === 'success' ? (
                            <>
                                <span role="img" aria-label="success">✅</span>
                                <span>Upload successful!</span>
                                {blobId && (
                                    <button onClick={copyBlobId} className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-all">Copy Blob ID</button>
                                )}
                            </>
                        ) : (
                            <>
                                <span role="img" aria-label="error">❌</span>
                                <span>Upload failed</span>
                            </>
                        )}
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes fade-in {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1);
                }
                @keyframes pop {
                    0% { transform: scale(0.7); }
                    80% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-pop {
                    animation: pop 0.5s cubic-bezier(0.4,0,0.2,1);
                }
            `}</style>
        </div>
    );
}