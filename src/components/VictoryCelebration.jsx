import React, { useEffect, useRef, useState } from 'react'; // Import useState
import Confetti from 'react-confetti'; // Import Confetti

const styles = {
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
    zIndex: 20, // High z-index to be on top
    pointerEvents: 'auto', // Allow interaction if needed, though maybe just display
  },
  victoryText: {
    fontSize: '5rem',
    fontWeight: 'bold',
    color: 'gold',
    textShadow: '3px 3px 5px rgba(0,0,0,0.7)',
    animation: 'zoomIn 0.5s ease-out',
  },
  // Keyframes for animation
  '@keyframes zoomIn': {
    from: {
      transform: 'scale(0.5)',
      opacity: 0,
    },
    to: {
      transform: 'scale(1)',
      opacity: 1,
    },
  },
};

// This component now ONLY shows the final "VICTORY!" text after declaration.
const VictoryCelebration = ({ onComplete }) => {
  const timeoutRef = useRef(null); // Ref to store the timeout ID
  // Add state to delay enabling click/touch/key shortcuts
  const [enableEarlyExit, setEnableEarlyExit] = useState(false);

  // Function to handle completion (navigation)
  const handleComplete = () => {
    // Only process if early exit is enabled
    if (!enableEarlyExit) return;

    console.log('VictoryCelebration: Completing celebration.');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Clear the timeout if it's still running
      timeoutRef.current = null;
    }
    if (onComplete) {
      onComplete();
    }
  };

  useEffect(() => {
    console.log('VictoryCelebration: Timer started (10s).');
    // Start the timer
    timeoutRef.current = setTimeout(() => {
      console.log('VictoryCelebration: Timer finished, calling handleComplete.');
      handleComplete(); // Call the completion handler when timer finishes
    }, 10000); // Show for 10 seconds

    // Enable early exit after a short delay (1.5 seconds)
    // This prevents immediate dismissal from clicks that were meant to "Declare Victory"
    const earlyExitDelay = setTimeout(() => {
      console.log('VictoryCelebration: Early exit enabled');
      setEnableEarlyExit(true);
    }, 1500);

    // Add event listeners for early exit
    const handleEarlyExit = (event) => {
      if (!enableEarlyExit) return; // Only process if early exit is enabled
      console.log(`VictoryCelebration: Early exit triggered by ${event.type}.`);
      handleComplete();
    };

    window.addEventListener('click', handleEarlyExit);
    window.addEventListener('touchstart', handleEarlyExit);
    window.addEventListener('keydown', handleEarlyExit);

    // Cleanup function
    return () => {
      console.log('VictoryCelebration: Cleanup.');
      // Clear the timeout if the component unmounts before 10 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearTimeout(earlyExitDelay);
      // Remove event listeners
      window.removeEventListener('click', handleEarlyExit);
      window.removeEventListener('touchstart', handleEarlyExit);
      window.removeEventListener('keydown', handleEarlyExit);
    };
  }, [enableEarlyExit, onComplete]); // Add enableEarlyExit to dependencies

  return (
    // Add onClick, onTouchStart handlers to the overlay for early exit
    <div style={styles.celebrationOverlay} onClick={handleComplete} onTouchStart={handleComplete}>
      {/* Move Confetti component before the text to ensure it renders behind */}
      <Confetti
        recycle={true}
        numberOfPieces={2000} // Increased from 800 to 2000 for much more confetti
        gravity={0.12} // Slightly reduced gravity so confetti floats longer
        initialVelocityY={30} // Increased initial velocity for a more explosive effect
        colors={['#FFD700', '#FF4500', '#00BFFF', '#32CD32', '#FF69B4', '#FFFFFF', '#9370DB']} // More festive color mix
        width={window.innerWidth}
        height={window.innerHeight}
        tweenDuration={5000} // Longer confetti animation
        friction={0.97} // Less friction so confetti pieces travel further
        // Remove confettiSource to spread confetti across the entire canvas width
        // Add spread to distribute confetti horizontally
        spread={180}
        // Increase wind to push confetti around more randomly
        wind={0.05}
        // Add some random rotation
        initialVelocityX={10}
        // Run a single origin burst pattern to start
        run={true}
      />
      {/* Inject keyframes using a style tag */}
      <style>
        {`
          @keyframes zoomIn {
            from {
              transform: scale(0.5);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
      {/* Add z-index to ensure text is on top of confetti */}
      <div style={{
        ...styles.victoryText,
        position: 'relative',
        zIndex: 30
      }}>
        VICTORY!
      </div>
      {/* Add instruction text that appears after a delay */}
      {enableEarlyExit && (
        <div style={{
          position: 'absolute',
          bottom: '20%',
          color: 'white',
          fontSize: '1.5rem',
          textAlign: 'center',
          animation: 'fadeIn 1s ease-in',
          zIndex: 30 // Ensure this is above confetti too
        }}>
          Click, tap, or press any key to continue
        </div>
      )}
    </div>
  );
};

export default VictoryCelebration;