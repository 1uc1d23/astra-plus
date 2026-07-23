import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function TopLoadingBar() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(15); // Start initial chunk

      // Trickle progress up to 90% while pending
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 150);
    } else {
      // Complete bar to 100% and fade out
      setProgress(100);
      timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-0.5 w-full bg-transparent">
      <div
        className="h-full bg-accent transition-all duration-300 ease-out shadow-[0_0_8px_var(--accent)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}