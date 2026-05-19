import '../styles/water-background.css';

/**
 * WaterBackground - Lightweight animated water effect component
 * 
 * Features:
 * - Pure CSS animations with gradients
 * - Smooth flowing water waves
 * - Soft blue calming tones
 * - Optimized for tablet performance
 * - Low opacity for UI readability
 * - No video or heavy assets
 */
export function WaterBackground() {
  return (
    <div className="water-background-container" aria-hidden="true">
      {/* Gradient base layer - soft blue tones */}
      <div className="water-gradient-base" />
      
      {/* Multiple animated wave layers for depth */}
      <div className="water-waves-container">
        <div className="water-wave water-wave-1" />
        <div className="water-wave water-wave-2" />
        <div className="water-wave water-wave-3" />
        <div className="water-wave water-wave-4" />
        <div className="water-wave water-wave-5" />
        <div className="water-wave water-wave-6" />
      </div>
      
      {/* Floating bubbles for added realism */}
      <div className="water-bubbles">
        <div className="bubble bubble-1" />
        <div className="bubble bubble-2" />
        <div className="bubble bubble-3" />
        <div className="bubble bubble-4" />
        <div className="bubble bubble-5" />
      </div>
      
      {/* Shimmer overlay for depth and light effect */}
      <div className="water-shimmer" />
      <div className="water-shimmer water-shimmer-2" />
    </div>
  );
}
