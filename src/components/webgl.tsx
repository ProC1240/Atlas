'use client';
import { useEffect, useState, type ReactNode } from 'react';

export function WebGL({
  children,
  fallback,
  className = '',
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      setSupported(Boolean(gl));
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setSupported(false);
    }
  }, []);
  if (supported !== true)
    return (
      <div className={`scene-fallback ${className}`}>
        {supported === null ? <span className="loading-orbit" /> : fallback}
      </div>
    );
  return <div className={`three-scene ${className}`}>{children}</div>;
}
