import React, { useEffect, useMemo, useRef } from 'react';
import { MeshGeometry, Vector3 } from '../studio/meshGeometry';

interface Projected { x: number; y: number; z: number }
interface Props {
  mesh: MeshGeometry;
  selectedGroup: string | null;
  onSelectGroup: (group: string) => void;
  expanded?: boolean;
}

function rotate(point: Vector3, yaw: number, pitch: number): Vector3 {
  const [x, y, z] = point;
  const cx = Math.cos(yaw), sx = Math.sin(yaw), cy = Math.cos(pitch), sy = Math.sin(pitch);
  const x1 = x * cx + z * sx;
  const z1 = z * cx - x * sx;
  return [x1, y * cy - z1 * sy, y * sy + z1 * cy];
}

export const MeshViewport: React.FC<Props> = ({ mesh, selectedGroup, onSelectGroup, expanded }) => {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ yaw: -0.55, pitch: -0.35, zoom: 1, drag: null as { x: number; y: number } | null });
  const hitRegions = useRef<{ vertices: [Projected, Projected, Projected]; group: string; depth: number }[]>([]);
  const scheduledFrame = useRef<number | null>(null);
  const renderFrame = useRef<() => void>(() => {});
  const stride = Math.max(1, Math.ceil(mesh.triangles.length / 4500));
  const displayedTriangles = useMemo(
    () => mesh.triangles.filter((_,index) => index % stride === 0),
    [mesh, stride]
  );
  // Rendering is coalesced to one animation frame; pointer events never trigger a React tree rerender.
  const scheduleDraw = () => {
    if (scheduledFrame.current !== null) return;
    scheduledFrame.current = requestAnimationFrame(() => {
      scheduledFrame.current = null;
      renderFrame.current();
    });
  };

  useEffect(() => {
    const target = canvas.current, frame = host.current;
    if (!target || !frame) return;
    const draw = () => {
      const width = Math.max(120, frame.clientWidth);
      const height = Math.max(160, frame.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (target.width !== pixelWidth || target.height !== pixelHeight) {
        target.width = pixelWidth;
        target.height = pixelHeight;
        target.style.width = width + 'px';
        target.style.height = height + 'px';
      }
      const ctx = target.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#101e30';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#29415a';
      ctx.lineWidth = 0.6;
      for (let y = 24; y <height; y += 38) {
        ctx.beginPath(); ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
      }

      const { min, max } = mesh.bounds;
      const mid: Vector3 = [(min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2];
      const span = Math.max(...max.map((v,i) => v-min[i]),0.00001);
      const scale = Math.min(width, height) * 0.72 * view.current.zoom / span;
      const projected: Projected[] = mesh.vertices.map(v => {
        const [x,y,z] = rotate([v[0]-mid[0],v[1]-mid[1],v[2]-mid[2]],view.current.yaw,view.current.pitch);
        return { x:width/2 + x*scale, y:height/2 - y*scale, z };
      });
      const polygons = displayedTriangles.map(face => {
        const verts = face.corners.map(i=>projected[i]) as [Projected,Projected,Projected];
        const ux=verts[1].x-verts[0].x, uy=verts[1].y-verts[0].y;
        const vx=verts[2].x-verts[0].x, vy=verts[2].y-verts[0].y;
        const signedArea = ux*vy-uy*vx;
        return {vertices: verts, group:face.group, depth:verts.reduce((sum,p)=>sum+p.z,0)/3, shade:Math.max(0.18,Math.min(0.85,0.43+signedArea/Math.max(50000,width*height*0.15)))};
      }).sort((a,b)=>a.depth-b.depth);
      hitRegions.current = polygons;
      polygons.forEach(poly => {
        ctx.beginPath();
        ctx.moveTo(poly.vertices[0].x,poly.vertices[0].y);
        ctx.lineTo(poly.vertices[1].x,poly.vertices[1].y);
        ctx.lineTo(poly.vertices[2].x,poly.vertices[2].y);
        ctx.closePath();
        const highlight=!!selectedGroup && selectedGroup===poly.group;
        ctx.fillStyle= highlight ? 'rgba(103,232,249,0.66)' : 'rgba(76,148,189,' + poly.shade.toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = highlight ? 'rgba(224,255,255,0.9)' : 'rgba(20,38,57,0.35)';
        ctx.lineWidth= highlight ? 1.1 : 0.35;
        ctx.stroke();
      });
      ctx.fillStyle='#9eb7cd';
      ctx.font='11px monospace';
      ctx.fillText('OBJ TRIANGULATED MESH · LOCAL INSPECTION ONLY',12,height-15);
      if(stride>1) ctx.fillText('DISPLAY SAMPLED 1/'+stride,12,19);
    };
    renderFrame.current = draw;
    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(frame);
    draw();
    return () => {
      observer.disconnect();
      if (scheduledFrame.current !== null) cancelAnimationFrame(scheduledFrame.current);
      scheduledFrame.current = null;
    };
  },[mesh, selectedGroup, expanded, displayedTriangles]);

  const pick=(x:number,y:number) => {
    for (let i=hitRegions.current.length-1;i>=0;i--) {
      const p=hitRegions.current[i].vertices;
      const area=(a:Projected,b:Projected,cx:number,cy:number) => (cx-a.x)*(b.y-a.y)-(cy-a.y)*(b.x-a.x);
      const s1=area(p[0],p[1],x,y),s2=area(p[1],p[2],x,y),s3=area(p[2],p[0],x,y);
      if ((s1>=0&&s2>=0&&s3>=0)||(s1<=0&&s2<=0&&s3<=0)) {onSelectGroup(hitRegions.current[i].group);return;}
    }
  };

  return <div ref={host} className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg" aria-label="Imported mesh preview" role="group">
    <canvas ref={canvas} tabIndex={0} aria-label="Interactive OBJ geometry inspection canvas" aria-describedby="mesh-view-help" className="h-full w-full cursor-grab touch-none"
      onKeyDown={event => {
        const key = event.key;
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          event.preventDefault(); view.current.yaw += key === 'ArrowLeft' ? -0.12 : 0.12;
        } else if (key === 'ArrowUp' || key === 'ArrowDown') {
          event.preventDefault(); view.current.pitch = Math.max(-1.5, Math.min(1.5, view.current.pitch + (key === 'ArrowUp' ? -0.12 : 0.12)));
        } else if (key === '+' || key === '=') {
          event.preventDefault(); view.current.zoom = Math.min(3, view.current.zoom * 1.1);
        } else if (key === '-') {
          event.preventDefault(); view.current.zoom = Math.max(0.35, view.current.zoom / 1.1);
        } else if (key === 'Home') {
          event.preventDefault(); view.current = {yaw:-0.55,pitch:-0.35,zoom:1,drag:null};
        } else { return; }
        scheduleDraw();
      }}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);view.current.drag={x:e.clientX,y:e.clientY};}}
      onPointerMove={e=>{const d=view.current.drag;if (!d)return;view.current.yaw+=(e.clientX-d.x)*0.008;view.current.pitch=Math.max(-1.5,Math.min(1.5,view.current.pitch+(e.clientY-d.y)*0.008));view.current.drag={x:e.clientX,y:e.clientY};scheduleDraw();}}
      onPointerUp={e=>{const d=view.current.drag;view.current.drag=null;if(d&&Math.abs(d.x-e.clientX)<4&&Math.abs(d.y-e.clientY)<4) {const r=e.currentTarget.getBoundingClientRect();pick(e.clientX-r.left,e.clientY-r.top);}}}
      onPointerCancel={()=>{view.current.drag=null;}}
      onWheel={e=>{view.current.zoom=Math.max(0.35,Math.min(3,view.current.zoom*(e.deltaY<0?1.1:0.9)));scheduleDraw();}}
    />
    <p id="mesh-view-help" className="sr-only">Use arrow keys to rotate, plus or minus to zoom, and Home to reset. Use the product tree to select an OBJ group.</p>
    <div className="absolute top-3 right-3 flex gap-2">
      <button type="button" onClick={()=>{view.current.zoom=Math.min(3,view.current.zoom*1.2);scheduleDraw();}} aria-label="Zoom in" className="min-h-[44px] min-w-[44px] rounded border border-white/20 bg-[#14273a]/90 px-2 py-1 text-white">+</button>
      <button type="button" onClick={()=>{view.current.zoom=Math.max(0.35,view.current.zoom/1.2);scheduleDraw();}} aria-label="Zoom out" className="min-h-[44px] min-w-[44px] rounded border border-white/20 bg-[#14273a]/90 px-2 py-1 text-white">−</button>
      <button type="button" onClick={()=>{view.current={yaw:-0.55,pitch:-0.35,zoom:1,drag:null};scheduleDraw();}} className="min-h-[44px] min-w-[44px] rounded border border-white/20 bg-[#14273a]/90 px-2 py-1 text-xs text-white">Reset</button>
    </div>
  </div>;
};
