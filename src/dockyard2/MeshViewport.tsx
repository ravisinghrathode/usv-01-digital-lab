import React, { useEffect, useRef } from 'react';
import { meshBounds, type Mesh, type Vec3 } from './mesh';

interface Props { mesh:Mesh; title:string; }
const LINE='#72aabe';
/**
 * Web-independent 2D canvas projection of an imported local OBJ.
 * It is an inspector, not an engineering geometry kernel.
 */
export function MeshViewport({mesh,title}:Props) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const frame=useRef<number|null>(null);
  const orbit=useRef({yaw:-0.55,pitch:0.28,zoom:1.0});
  const drag=useRef<{x:number;y:number}|null>(null);

  useEffect(()=>{
    const node=canvas.current;if(!node)return;
    const bounds=meshBounds(mesh);
    const faceLimit=6000; // sampled uniformly, never misstate the full face count
    const step=Math.max(1,Math.ceil(mesh.faces.length/faceLimit));
    const draw=()=>{
      frame.current=null;
      const ctx=node.getContext('2d');if(!ctx)return;
      const rect=node.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
      if(node.width!==w||node.height!==h){node.width=w;node.height=h;}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const width=rect.width,height=rect.height;
      ctx.clearRect(0,0,width,height);
      const {yaw,pitch,zoom}=orbit.current;
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const project=(p:Vec3)=>{
        const x=(p.x-bounds.center.x)/bounds.size;
        const y=(p.y-bounds.center.y)/bounds.size;
        const z=(p.z-bounds.center.z)/bounds.size;
        const rx=x*cy+z*sy,rz=-x*sy+z*cy;
        return {x:width/2+rx*Math.min(width,height)*1.4*zoom,
          y:height/2-(y*cp-rz*sp)*Math.min(width,height)*1.4*zoom,
          depth:y*sp+rz*cp};
      };
      const projected=mesh.vertices.map(project);
      const faces: {xy:{x:number;y:number}[];depth:number;shade:number}[]=[];
      for(let i=0;i<mesh.faces.length;i+=step){
        const f=mesh.faces[i],points=[projected[f.a],projected[f.b],projected[f.c]];
        if(points.some(p=>!p))continue;
        const dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
        const ex=points[2].x-points[0].x,ey=points[2].y-points[0].y;
        const cross=dx*ey-dy*ex;
        faces.push({xy:points,depth:(points[0].depth+points[1].depth+points[2].depth)/3,
          shade:Math.max(.1,Math.min(.8,Math.abs(cross)/(width*height)*240))});
      }
      faces.sort((a,b)=>a.depth-b.depth);
      ctx.lineWidth=.7;
      for(const face of faces){
        ctx.beginPath();ctx.moveTo(face.xy[0].x,face.xy[0].y);
        ctx.lineTo(face.xy[1].x,face.xy[1].y);
        ctx.lineTo(face.xy[2].x,face.xy[2].y);ctx.closePath();
        ctx.fillStyle=`rgba(42,112,141,${.35+face.shade*.5})`;ctx.fill();
        ctx.strokeStyle=LINE;ctx.globalAlpha=.5;ctx.stroke();ctx.globalAlpha=1;
      }
      ctx.fillStyle='#bcd7e5';ctx.font='12px system-ui';
      ctx.fillText(`${mesh.faces.length.toLocaleString()} source triangles · preview sampling ${Math.ceil(mesh.faces.length/step).toLocaleString()}`,12,height-14);
    };
    const request=()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(draw);};
    const ro=new ResizeObserver(request);ro.observe(node);
    const onResize=()=>request();
    window.addEventListener('resize',onResize);
    const pointerDown=(e:PointerEvent)=>{drag.current={x:e.clientX,y:e.clientY};node.setPointerCapture(e.pointerId);};
    const pointerMove=(e:PointerEvent)=>{
      if(!drag.current)return;
      orbit.current.yaw+=(e.clientX-drag.current.x)*.008;
      orbit.current.pitch=Math.min(1.4,Math.max(-1.4,orbit.current.pitch+(e.clientY-drag.current.y)*.008));
      drag.current={x:e.clientX,y:e.clientY};request();
    };
    const pointerUp=()=>{drag.current=null;};
    const wheel=(e:WheelEvent)=>{e.preventDefault();orbit.current.zoom=Math.max(.35,Math.min(4,orbit.current.zoom*(e.deltaY>0?.92:1.08)));request();};
    const keydown=(e:KeyboardEvent)=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','Home'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='Home')orbit.current={yaw:-.55,pitch:.28,zoom:1};
      if(e.key==='ArrowLeft')orbit.current.yaw-=.15;
      if(e.key==='ArrowRight')orbit.current.yaw+=.15;
      if(e.key==='ArrowUp')orbit.current.pitch=Math.max(-1.4,orbit.current.pitch-.15);
      if(e.key==='ArrowDown')orbit.current.pitch=Math.min(1.4,orbit.current.pitch+.15);
      if(e.key==='+'||e.key==='=')orbit.current.zoom=Math.min(4,orbit.current.zoom*1.12);
      if(e.key==='-'||e.key==='_')orbit.current.zoom=Math.max(.35,orbit.current.zoom/1.12);
      request();
    };
    node.addEventListener('pointerdown',pointerDown);
    node.addEventListener('pointermove',pointerMove);
    node.addEventListener('pointerup',pointerUp);
    node.addEventListener('pointercancel',pointerUp);
    node.addEventListener('wheel',wheel,{passive:false});
    node.addEventListener('keydown',keydown);
    request();
    return()=>{
      ro.disconnect();window.removeEventListener('resize',onResize);
      node.removeEventListener('pointerdown',pointerDown);
      node.removeEventListener('pointermove',pointerMove);
      node.removeEventListener('pointerup',pointerUp);
      node.removeEventListener('pointercancel',pointerUp);
      node.removeEventListener('wheel',wheel);
      node.removeEventListener('keydown',keydown);
      if(frame.current!==null)cancelAnimationFrame(frame.current);
    };
  },[mesh]);
  return <canvas className="d2-mesh-canvas" ref={canvas} tabIndex={0} role="img"
    aria-label={title+' local OBJ visual inspection. Arrow keys orbit, plus and minus zoom, Home resets.'}/>;
}
