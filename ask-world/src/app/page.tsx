// src/app/page.tsx
import AudioRecorder from '@/components/AudioRecorder';
import { ErudaProvider } from '@/components/ClientContent/Eruda';

export default function Home() {
  return (
    <ErudaProvider>
      <main className="min-h-screen bg-gray-100">
        <AudioRecorder />
      </main>
    </ErudaProvider>
  );
}