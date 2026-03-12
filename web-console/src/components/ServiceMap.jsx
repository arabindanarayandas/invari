import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Activity } from 'lucide-react';

const ServiceMap = ({ flashEffect, setFlashEffect }) => {
  const canvasRef = useRef(null);
  const [packets, setPackets] = useState([]);
  const animationFrameRef = useRef(null);

  // Define nodes
  const agents = [
    { id: 'bolna', name: 'Bolna Voice Bot', y: 100 },
    { id: 'autogpt', name: 'AutoGPT-Sales', y: 200 },
    { id: 'support', name: 'Customer Support', y: 300 },
    { id: 'data', name: 'Data Analyst Pro', y: 400 },
    { id: 'marketing', name: 'Marketing Agent', y: 500 },
  ];

  const destinations = [
    { id: 'stripe', name: 'Stripe API', y: 120 },
    { id: 'postgres', name: 'Postgres DB', y: 240 },
    { id: 'twilio', name: 'Twilio SMS', y: 360 },
    { id: 'openai', name: 'OpenAI GPT-4', y: 480 },
  ];

  const fluxGuardNode = {
    x: 0, // Will be set dynamically
    y: 0, // Will be set dynamically
    radius: 60,
  };

  // Generate random packet
  const generatePacket = (type = 'stable') => {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];

    return {
      id: Math.random().toString(36).substr(2, 9),
      type, // 'stable', 'repaired', 'blocked'
      phase: 'incoming', // 'incoming', 'processing', 'outgoing', 'blocked'
      progress: 0,
      agent,
      destination,
      speed: 0.008 + Math.random() * 0.004,
    };
  };

  // Add packets periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      let type = 'stable';

      if (rand < 0.05) {
        type = 'blocked';
      } else if (rand < 0.20) {
        type = 'repaired';
      }

      setPackets(prev => [...prev, generatePacket(type)]);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Trigger flash effect when flashEffect changes
  useEffect(() => {
    if (flashEffect) {
      const timer = setTimeout(() => setFlashEffect(null), 500);
      return () => clearTimeout(timer);
    }
  }, [flashEffect, setFlashEffect]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Calculate FluxGuard position
    fluxGuardNode.x = width / 2;
    fluxGuardNode.y = height / 2;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw connections (edges)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;

      // Draw agent to FluxGuard connections
      agents.forEach(agent => {
        ctx.beginPath();
        ctx.moveTo(150, agent.y);
        ctx.lineTo(fluxGuardNode.x, fluxGuardNode.y);
        ctx.stroke();
      });

      // Draw FluxGuard to destination connections
      destinations.forEach(dest => {
        ctx.beginPath();
        ctx.moveTo(fluxGuardNode.x, fluxGuardNode.y);
        ctx.lineTo(width - 150, dest.y);
        ctx.stroke();
      });

      // Draw agent nodes
      agents.forEach(agent => {
        // Node background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(20, agent.y - 20, 130, 40, 8);
        ctx.fill();
        ctx.stroke();

        // Icon
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.beginPath();
        ctx.arc(45, agent.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = '#334155';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(agent.name, 62, agent.y + 4);
      });

      // Draw destination nodes
      destinations.forEach(dest => {
        // Node background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(width - 150, dest.y - 20, 130, 40, 8);
        ctx.fill();
        ctx.stroke();

        // Icon
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.beginPath();
        ctx.arc(width - 125, dest.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = '#334155';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(dest.name, width - 105, dest.y + 4);
      });

      // Draw FluxGuard central node
      const gradient = ctx.createRadialGradient(
        fluxGuardNode.x,
        fluxGuardNode.y,
        0,
        fluxGuardNode.x,
        fluxGuardNode.y,
        fluxGuardNode.radius
      );

      // Flash effect based on type
      if (flashEffect === 'blocked') {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.1)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (flashEffect === 'repaired') {
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
        gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.1)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(fluxGuardNode.x, fluxGuardNode.y, fluxGuardNode.radius, 0, Math.PI * 2);
      ctx.fill();

      // Main node circle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.strokeStyle = flashEffect === 'blocked' ? 'rgba(239, 68, 68, 0.8)' :
                        flashEffect === 'repaired' ? 'rgba(251, 191, 36, 0.8)' :
                        'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fluxGuardNode.x, fluxGuardNode.y, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Invari text
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Invari', fluxGuardNode.x, fluxGuardNode.y - 5);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText('Security Gateway', fluxGuardNode.x, fluxGuardNode.y + 10);

      // Draw and update packets
      setPackets(prevPackets => {
        const updatedPackets = [];

        prevPackets.forEach(packet => {
          let newProgress = packet.progress + packet.speed;
          let newPhase = packet.phase;

          // Phase transitions
          if (packet.phase === 'incoming' && newProgress >= 1) {
            newProgress = 0;
            newPhase = packet.type === 'blocked' ? 'blocked' : 'processing';
          } else if (packet.phase === 'processing' && newProgress >= 1) {
            newProgress = 0;
            newPhase = 'outgoing';
          } else if (packet.phase === 'outgoing' && newProgress >= 1) {
            // Packet reached destination, don't add to updated packets
            return;
          } else if (packet.phase === 'blocked' && newProgress >= 0.5) {
            // Blocked packet fades out
            return;
          }

          // Calculate packet position
          let x, y;

          if (packet.phase === 'incoming') {
            const startX = 150;
            const startY = packet.agent.y;
            const endX = fluxGuardNode.x;
            const endY = fluxGuardNode.y;

            x = startX + (endX - startX) * newProgress;
            y = startY + (endY - startY) * newProgress;
          } else if (packet.phase === 'processing') {
            // Stay at FluxGuard position briefly
            x = fluxGuardNode.x;
            y = fluxGuardNode.y;
          } else if (packet.phase === 'outgoing') {
            const startX = fluxGuardNode.x;
            const startY = fluxGuardNode.y;
            const endX = width - 150;
            const endY = packet.destination.y;

            x = startX + (endX - startX) * newProgress;
            y = startY + (endY - startY) * newProgress;
          } else if (packet.phase === 'blocked') {
            x = fluxGuardNode.x;
            y = fluxGuardNode.y;
          }

          // Draw packet
          ctx.save();

          // Determine color based on phase and type
          let color;
          if (packet.phase === 'incoming') {
            color = 'rgba(59, 130, 246, 0.9)'; // Blue
          } else if (packet.phase === 'blocked') {
            const opacity = 0.9 - (newProgress * 1.8);
            color = `rgba(239, 68, 68, ${opacity})`; // Red fading out
          } else if (packet.phase === 'outgoing') {
            color = 'rgba(16, 185, 129, 0.9)'; // Green
          } else if (packet.phase === 'processing') {
            color = packet.type === 'repaired' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(59, 130, 246, 0.9)';
          }

          // Glow effect
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          updatedPackets.push({
            ...packet,
            progress: newProgress,
            phase: newPhase,
          });
        });

        return updatedPackets;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [flashEffect]);

  return (
    <div className="relative w-full h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
          Traffic Legend
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-slate-600">Incoming (Unknown)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-600">Outgoing (Validated)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs text-slate-600">Repaired</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-600">Blocked</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-white/95 border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
          Live Stats
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-600">Active Packets:</span>
            <span className="text-xs font-mono text-slate-900">{packets.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-600">Processing:</span>
            <span className="text-xs font-mono text-slate-900">
              {packets.filter(p => p.phase === 'processing').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceMap;
