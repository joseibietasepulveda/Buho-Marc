"use client";

import { useEffect, useRef } from "react";

type ColorBendsProps = {
  color?: string;
  speed?: number;
  frequency?: number;
  noise?: number;
  bandWidth?: number;
  rotation?: number;
  fadeTop?: number;
  iterations?: number;
  intensity?: number;
};

export default function ColorBends({
  color = "#A855F7",
  speed = 0.2,
  frequency = 1,
  noise = 0.15,
  bandWidth = 0.14,
  rotation = 90,
  fadeTop = 0.75,
  iterations = 1,
  intensity = 1.3,
}: ColorBendsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let animation = 0;
    const rgb = color.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16)) ?? [168, 85, 247];

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const time = frame * speed * 0.012;
      const radians = (rotation * Math.PI) / 180;
      const lines = Math.max(18, Math.floor(rect.width / 48));
      const area = Math.max(rect.width, rect.height);

      context.save();
      context.translate(rect.width / 2, rect.height / 2);
      context.rotate(radians);
      context.translate(-rect.width / 2, -rect.height / 2);
      context.globalCompositeOperation = "screen";

      for (let index = 0; index < lines; index += 1) {
        const progress = index / (lines - 1);
        const x = -area * 0.28 + progress * area * 1.55;
        const wave = Math.sin(progress * Math.PI * frequency * 3.1 + time + index * noise * 1.8);
        const waveTwo = Math.sin(progress * Math.PI * frequency * 7.2 - time * 0.8 + index * noise);
        const y = rect.height * 0.75 + wave * rect.height * 0.2 + waveTwo * rect.height * noise * 0.42;
        const lineWidth = Math.max(2, area * bandWidth * (0.22 + Math.sin(progress * Math.PI) * 0.8));
        const alpha = Math.max(0, Math.sin(progress * Math.PI)) * 0.13 * intensity / Math.max(iterations, 1);
        const gradient = context.createLinearGradient(x, y - lineWidth, x, y + lineWidth);
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        gradient.addColorStop(0.42, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`);
        gradient.addColorStop(0.56, `rgba(224, 183, 255, ${alpha * 0.9})`);
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        context.strokeStyle = gradient;
        context.lineWidth = lineWidth;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(x, y);
        context.bezierCurveTo(
          x + area * 0.22,
          y - waveTwo * rect.height * 0.25,
          x + area * 0.43,
          y + wave * rect.height * 0.18,
          x + area * 0.74,
          y + Math.sin(time * 1.1 + index) * rect.height * 0.1,
        );
        context.stroke();
      }

      const fade = context.createLinearGradient(0, 0, 0, rect.height);
      fade.addColorStop(0, `rgba(11, 9, 18, ${fadeTop})`);
      fade.addColorStop(0.43, "rgba(11, 9, 18, 0)");
      fade.addColorStop(1, "rgba(11, 9, 18, 0.55)");
      context.globalCompositeOperation = "source-over";
      context.fillStyle = fade;
      context.fillRect(0, 0, rect.width, rect.height);
      context.restore();

      frame += 1;
      animation = requestAnimationFrame(draw);
    };

    animation = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation);
  }, [bandWidth, color, fadeTop, frequency, intensity, iterations, noise, rotation, speed]);

  return <canvas ref={canvasRef} className="bends-canvas" aria-hidden="true" />;
}
