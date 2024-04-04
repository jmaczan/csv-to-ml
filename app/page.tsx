"use client";
import Uploader from "@/components/uploader";
import { Toaster } from "@/components/toaster";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <Toaster />
      <p className="font-bold text-gray-900 w-full max-w-lg text-center mt-6 mb-6">
        CSV-to-ML
      </p>
      <div className="bg-white/30 p-12 pb-2 -lg max-w-xl mx-auto w-full">
        <Uploader />
      </div>
    </main>
  );
}
