// src/components/AudioRecorder.tsx
'use client';

import { MiniKit, Permission } from '@worldcoin/minikit-js';
import { RequestPermissionPayload } from '@worldcoin/minikit-js';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import CONTRACT_ABI from "../../abi/askworld.json";

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

const CONTRACT_ADDRESS = "0xe3Da9ce8C15F3fcEfdc27036e953b08C8B1D39E7";

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [blobId, setBlobId] = useState<string | null>(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [showAskPage, setShowAskPage] = useState(false);
    const [question, setQuestion] = useState('');
    const [submittingQuestion, setSubmittingQuestion] = useState(false);
    const [questionStatus, setQuestionStatus] = useState<string>('');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Mock questions data - in a real app, this would come from an API
    const questions = [
        "What's your favorite way to spend a weekend?",
        "If you could have dinner with anyone, who would it be?",
        "What's the most valuable lesson you've learned?",
        "What's your biggest dream for the future?",
        "What makes you feel most alive?"
    ];

    // Track recording duration
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRecording && recordingStartTime) {
            interval = setInterval(() => {
                const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                setRecordingDuration(duration);
            }, 100);
        } else {
            setRecordingDuration(0);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isRecording, recordingStartTime]);

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
            setRecordingStartTime(Date.now());
        } catch (error) {
            setUploadStatus('Failed to access microphone: ' + (error as Error).message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingStartTime(null);
            setRecordingDuration(0);
        }
    };

    const handleQuestionSubmit = async () => {
        if (!question.trim()) {
            setQuestionStatus('Please enter a question.');
            return;
        }

        setSubmittingQuestion(true);
        setQuestionStatus('Submitting question...');
        setShowToast(false);

        try {
            // For now, we'll just simulate a submission
            // In the future, this could connect to an API
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

            setQuestionStatus('Question submitted successfully!');
            setToastType('success');
            setShowToast(true);
            setQuestion('');

            // Return to main page after a delay
            setTimeout(() => {
                setShowAskPage(false);
                setQuestionStatus('');
            }, 2000);

        } catch (error) {
            console.error('Error submitting question:', error);
            setQuestionStatus('Error submitting question: ' + (error as Error).message);
            setToastType('error');
            setShowToast(true);
        } finally {
            setSubmittingQuestion(false);
        }
    };

    // Swipe functionality
    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging) {
            setCurrentX(e.touches[0].clientX);
        }
    };

    const handleTouchEnd = () => {
        if (isDragging) {
            const diff = startX - currentX;
            const threshold = 50;

            if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentCardIndex < questions.length - 1) {
                    // Swipe left - next card
                    setCurrentCardIndex(currentCardIndex + 1);
                } else if (diff < 0 && currentCardIndex > 0) {
                    // Swipe right - previous card
                    setCurrentCardIndex(currentCardIndex - 1);
                }
            }

            setIsDragging(false);
            setCurrentX(0);
        }
    };

    const goToNextCard = () => {
        if (currentCardIndex < questions.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
        }
    };

    const goToPreviousCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
        }
    };

    const handleAfterUpload = async (walrusId: string) => {
        try {
            const payload = await MiniKit.commands.sendTransaction({
                transaction: [
                    {
                        address: CONTRACT_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: "submitAnswer",
                        args: [1, walrusId],
                    },
                ],
            });
            // Log both possible transaction id keys
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transactionId = (payload as any).transactionId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transaction_id = (payload as any).transaction_id;
            console.log('MiniKit transaction payload:', payload);
            if (transactionId) {
                console.log('transactionId:', transactionId);
            }
            if (transaction_id) {
                console.log('transaction_id:', transaction_id);
            }
            setUploadStatus('Transaction sent to World Chain!');
        } catch (err) {
            setUploadStatus('Failed to send transaction: ' + (err as Error).message);
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
                // Call the transaction function
                handleAfterUpload(result.blobId);
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

    // Ask page
    if (showAskPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 py-8 px-2">
                <div className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-fade-in">
                    <div className="flex flex-col items-center mb-6">
                        <Image src="/askworld-logo.png" alt="Ask World Logo" width={120} height={120} className="mb-2 animate-pop" />
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Mini World</h1>
                        <p className="text-sm text-gray-500 mb-2">Ask a question to the community</p>
                    </div>

                    <div className="w-full mb-6">
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Type your question here..."
                            className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                            disabled={submittingQuestion}
                        />
                    </div>

                    {questionStatus && (
                        <p className={`mb-4 text-center text-base font-medium ${questionStatus.startsWith('Question submitted successfully') ? 'text-green-600' : 'text-red-600'}`}>
                            {questionStatus}
                        </p>
                    )}

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={() => setShowAskPage(false)}
                            disabled={submittingQuestion}
                            className="flex-1 transition-all px-6 py-3 rounded-full font-semibold shadow-md bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleQuestionSubmit}
                            disabled={!question.trim() || submittingQuestion}
                            className="flex-1 transition-all px-6 py-3 rounded-full font-semibold shadow-md bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
                        >
                            {submittingQuestion ? 'Submitting...' : 'Submit Question'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Top-level: Ask/Answer buttons
    if (!showRecorder) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 py-8 px-2">
                <div className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-fade-in">
                    <Image src="/askworld-logo.png" alt="Ask World Logo" width={120} height={120} className="mb-6 animate-pop" />
                    <div className="flex gap-8 w-full justify-center">
                        <button
                            className="transition-all flex items-center gap-2 px-12 py-4 rounded-full font-bold shadow-lg bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-xl transform hover:scale-105 active:scale-95"
                            onClick={() => setShowAskPage(true)}
                        >
                            Ask
                        </button>
                        <button
                            className="transition-all flex items-center gap-2 px-12 py-4 rounded-full font-bold shadow-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-purple-400 text-xl transform hover:scale-105 active:scale-95"
                            onClick={() => setShowRecorder(true)}
                        >
                            Answer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Swipable cards UI
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 py-8 px-2"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="w-full max-w-md bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-fade-in">
                {/* Question display */}
                <div className="flex flex-col items-center mb-6 w-full">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center leading-tight">
                        {questions[currentCardIndex]}
                    </h2>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-gray-500">
                            {currentCardIndex + 1} of {questions.length}
                        </span>
                    </div>
                </div>

                {/* Big round Start Recording button or Stop button */}
                <div className="flex flex-col items-center w-full mb-6">
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            disabled={uploading}
                            className="start-recording-btn mb-2 animate-pop"
                        >
                        </button>
                    ) : (
                        <>
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full transition-all duration-100"
                                        style={{ width: `${Math.min((recordingDuration / 60) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <span className="text-red-500 font-medium text-sm">
                                    Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                            <button
                                onClick={stopRecording}
                                disabled={uploading}
                                className="stop-recording-btn mb-2 animate-pop"
                            >
                            </button>
                        </>
                    )}
                </div>

                {audioBlob && !isRecording && (
                    <div className="mb-6 w-full">
                        <audio controls src={URL.createObjectURL(audioBlob)} className="w-full rounded-lg border border-gray-200 shadow-sm" />
                    </div>
                )}

                {uploadStatus && (
                    <p className={`mb-4 text-center text-base font-medium ${uploadStatus.startsWith('Upload successful') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>
                )}

                {audioBlob && !isRecording && (
                    <button
                        onClick={handleUpload}
                        disabled={!audioBlob || uploading}
                        className="transition-all flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold shadow-md bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 mb-4"
                    >
                        {uploading ? 'Submitting...' : 'Submit'}
                    </button>
                )}

                {/* Navigation buttons */}
                {!isRecording && (
                    <div className="flex gap-4 w-full">
                        <button
                            onClick={goToPreviousCard}
                            disabled={currentCardIndex === 0}
                            className="flex-[0.5] transition-all px-2 py-1 rounded-full font-semibold shadow-md bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setShowRecorder(false)}
                            className="flex-[0.5] transition-all px-2 py-1 rounded-full font-semibold shadow-md bg-gradient-to-r from-purple-400 to-purple-500 text-white hover:from-purple-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            Back
                        </button>
                        <button
                            onClick={goToNextCard}
                            disabled={currentCardIndex === questions.length - 1}
                            className="flex-[0.5] transition-all px-2 py-1 rounded-full font-semibold shadow-md bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Swipe instructions */}
                {!isRecording && (
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        Swipe left/right to navigate between questions
                    </p>
                )}

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
                .start-recording-btn {
                    width: 8rem;
                    height: 8rem;
                    border-radius: 9999px;
                    background: linear-gradient(135deg, #ff0000 0%, #cc0000 50%, #990000 100%);
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.15),
                        0 0 0 12px rgba(255, 0, 0, 0.2),
                        0 12px 48px 0 rgba(255, 0, 0, 0.4), 
                        0 4px 16px 0 rgba(0,0,0,0.2),
                        inset 0 2px 0 rgba(255, 255, 255, 0.2),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.3);
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .start-recording-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, 
                        rgba(255, 255, 255, 0.2) 0%, 
                        rgba(255, 255, 255, 0.3) 25%, 
                        rgba(0, 0, 0, 0.1) 50%, 
                        rgba(255, 255, 255, 0.2) 75%, 
                        rgba(0, 0, 0, 0.1) 100%);
                    border-radius: 9999px;
                    pointer-events: none;
                }
                .start-recording-btn::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 2rem;
                    height: 2rem;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    pointer-events: none;
                }
                .start-recording-btn:active {
                    transform: scale(0.95);
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.1),
                        0 0 0 12px rgba(255, 0, 0, 0.15),
                        0 6px 24px 0 rgba(255, 0, 0, 0.3), 
                        0 2px 8px 0 rgba(0,0,0,0.15),
                        inset 0 2px 0 rgba(255, 255, 255, 0.1),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.2);
                    filter: brightness(0.9);
                }
                .start-recording-btn:hover {
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.2),
                        0 0 0 12px rgba(255, 0, 0, 0.25),
                        0 16px 64px 0 rgba(255, 0, 0, 0.5), 
                        0 6px 24px 0 rgba(0,0,0,0.25),
                        inset 0 2px 0 rgba(255, 255, 255, 0.25),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.4);
                }
                .stop-recording-btn {
                    width: 8rem;
                    height: 8rem;
                    border-radius: 9999px;
                    background: linear-gradient(135deg, #ff0000 0%, #cc0000 50%, #990000 100%);
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.15),
                        0 0 0 12px rgba(255, 0, 0, 0.2),
                        0 12px 48px 0 rgba(255, 0, 0, 0.4), 
                        0 4px 16px 0 rgba(0,0,0,0.2),
                        inset 0 2px 0 rgba(255, 255, 255, 0.2),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.3);
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .stop-recording-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, 
                        rgba(255, 255, 255, 0.2) 0%, 
                        rgba(255, 255, 255, 0.3) 25%, 
                        rgba(0, 0, 0, 0.1) 50%, 
                        rgba(255, 255, 255, 0.2) 75%, 
                        rgba(0, 0, 0, 0.1) 100%);
                    border-radius: 9999px;
                    pointer-events: none;
                }
                .stop-recording-btn::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 2rem;
                    height: 2rem;
                    background: black;
                    border-radius: 0.25rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    pointer-events: none;
                }
                .stop-recording-btn:active {
                    transform: scale(0.95);
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.1),
                        0 0 0 12px rgba(255, 0, 0, 0.15),
                        0 6px 24px 0 rgba(255, 0, 0, 0.3), 
                        0 2px 8px 0 rgba(0,0,0,0.15),
                        inset 0 2px 0 rgba(255, 255, 255, 0.1),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.2);
                    filter: brightness(0.9);
                }
                .stop-recording-btn:hover {
                    box-shadow: 
                        0 0 0 6px rgba(255, 255, 255, 0.2),
                        0 0 0 12px rgba(255, 0, 0, 0.25),
                        0 16px 64px 0 rgba(255, 0, 0, 0.5), 
                        0 6px 24px 0 rgba(0,0,0,0.25),
                        inset 0 2px 0 rgba(255, 255, 255, 0.25),
                        inset 0 -2px 0 rgba(0, 0, 0, 0.4);
                }
            `}</style>
        </div>
    );
}