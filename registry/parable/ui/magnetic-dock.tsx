"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface DockItem {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface MagneticDockProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: DockItem[];
  /** Resting icon size (px). */
  size?: number;
  /** Peak magnified size (px). */
  magnification?: number;
  /** Cursor influence radius (px). */
  distance?: number;
}

/**
 * MagneticDock — a macOS-style dock whose items magnify based on cursor
 * proximity, spring-smoothed. Keyboard focusable; under prefers-reduced-motion
 * the magnify is disabled but hover/focus styling remains.
 *
 * @parable/magnetic-dock
 */
export function MagneticDock({
  items,
  size = 44,
  magnification = 78,
  distance = 140,
  className,
  ...props
}: MagneticDockProps) {
  const mouseX = useMotionValue(Infinity);
  return (
    <div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-[64px] items-end gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 pb-2 backdrop-blur-md",
        className
      )}
      role="toolbar"
      aria-label="Dock"
      {...props}
    >
      {items.map((item, i) => (
        <DockIcon
          key={i}
          mouseX={mouseX}
          size={size}
          magnification={magnification}
          distance={distance}
          item={item}
        />
      ))}
    </div>
  );
}

function DockIcon({
  mouseX,
  size,
  magnification,
  distance,
  item,
}: {
  mouseX: MotionValue<number>;
  size: number;
  magnification: number;
  distance: number;
  item: DockItem;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const distanceCalc = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };
    return val - bounds.x - bounds.width / 2;
  });
  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );
  const width = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const content = (
    <motion.button
      ref={ref}
      style={{ width, height: width }}
      onClick={item.onClick}
      aria-label={item.label}
      title={item.label}
      className="flex aspect-square items-center justify-center rounded-xl bg-neutral-800 text-white shadow-sm outline-none ring-white/60 transition-colors hover:bg-neutral-700 focus-visible:ring-2"
    >
      <span className="grid place-items-center [&_svg]:size-1/2">
        {item.icon}
      </span>
    </motion.button>
  );

  return content;
}

export default MagneticDock;
