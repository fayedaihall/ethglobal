// src/app/page.tsx
import AudioRecorder from '@/components/AudioRecorder';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <AudioRecorder />
    </main>
  );
}