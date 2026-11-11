// Static towns and land routes for the old map, plus freight wagons that travel back and forth. Planning runs only when the terrain changes.
const CONTINENT_TOWN_NAMES = ['Valdora', 'Monteluce', 'Porta Nova', 'Silvaria', 'Fontana', 'Belmonte', 'Rivaforte'];

function paintContinentTown(ctx, town) {
  ctx.save();ctx.translate(town.x,town.y);ctx.lineWidth=.9;ctx.lineJoin='round';
  const house=(x,y,w,h,roof,tower=false)=>{
    ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x-w,y-h);ctx.lineTo(x,y-h-roof);ctx.lineTo(x+w,y-h);ctx.lineTo(x+w,y);ctx.closePath();
    ctx.fillStyle=RED;ctx.fill();ctx.strokeStyle=GREEN;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y-h-roof);ctx.lineTo(x+w,y-h);ctx.lineTo(x,y-h);ctx.closePath();ctx.fillStyle=GREEN;ctx.globalAlpha=.45;ctx.fill();ctx.globalAlpha=1;
    ctx.fillRect(x-1,y-4,2,4);ctx.fillRect(x-w*.55,y-h*.65,1.5,2.2);ctx.fillRect(x+w*.3,y-h*.65,1.5,2.2);
    if(tower){ctx.beginPath();ctx.moveTo(x,y-h-roof);ctx.lineTo(x,y-h-roof-5);ctx.lineTo(x+5,y-h-roof-3.5);ctx.lineTo(x,y-h-roof-2);ctx.stroke();}
  };
  // Back row: roofs, a storehouse, and the central bell tower. Front cottages cluster around the town entrance.
  house(-23,-9,6,10,7);house(-10,-13,6,12,8);house(17,-12,7,10,7);
  house(2,-9,6,21,11,true);house(27,-1,6,11,7);
  house(-27,4,7,11,7);house(-12,7,7,12,8);house(7,5,8,10,6);
  ctx.strokeStyle=GREEN;ctx.beginPath();ctx.moveTo(21,7);ctx.lineTo(34,7);ctx.moveTo(22,10);ctx.lineTo(33,10);ctx.stroke();
  ctx.restore();
  paintLabel(ctx,{x:town.x,y:town.y-52,text:town.name,fs:13,big:false,rot:0});
}

function continentRoute(points, from, to) {
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {points,lengths,length:lengths[lengths.length-1],from,to,key:[from.name,to.name].sort().join('|')};
}

function planContinentRoutes(w,occ,riv,previous) {
  const G=16,gw=Math.ceil(W/G)+1,gh=Math.ceil((H-TASKBAR)/G)+1,n=gw*gh,walk=new Uint8Array(n);
  for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){
    const px=x*G,py=y*G,v=occ.at(px,py);
    const townBody=w.towns.some(t=>Math.abs(px-t.x)<44&&py>t.y-65&&py<t.y+7);
    walk[y*gw+x]=!townBody&&(v===0||v===3||v===5||v===6)&&sTarget(px,py)>36&&sTarget(px-8,py)>24&&sTarget(px+8,py)>24&&sTarget(px,py-8)>24&&sTarget(px,py+8)>24?1:0;
  }
  const nearest=point=>{
    let best=-1,score=Infinity;
    for(let y=Math.max(1,Math.round(point[1]/G)-2);y<=Math.min(gh-2,Math.round(point[1]/G)+2);y++)for(let x=Math.max(1,Math.round(point[0]/G)-2);x<=Math.min(gw-2,Math.round(point[0]/G)+2);x++){
      const distance=Math.hypot(x*G-point[0],y*G-point[1]);if(walk[y*gw+x]&&distance<score){score=distance;best=y*gw+x;}
    }return best;
  };
  const validPoint=(x,y)=>{const ix=Math.round(x/G),iy=Math.round(y/G);return ix>=0&&iy>=0&&ix<gw&&iy<gh&&walk[iy*gw+ix]&&sTarget(x,y)>28;};
  const lineFree=(a,b)=>{const steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/5);for(let k=0;k<=steps;k++){const t=k/Math.max(steps,1);if(!validPoint(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;};
  function route(a,b){
    const start=nearest(a),goal=nearest(b);if(start<0||goal<0)return null;
    const cost=new Float32Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=[];
    const heuristic=id=>Math.hypot(id%gw-goal%gw,Math.floor(id/gw)-Math.floor(goal/gw));
    const push=(id,score)=>{let i=heap.length;heap.push([id,score]);while(i){const p=(i-1)>>1;if(heap[p][1]<=score)break;heap[i]=heap[p];i=p;}heap[i]=[id,score];};
    const pop=()=>{const root=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1][1]<heap[child][1])child++;if(heap[child][1]>=tail[1])break;heap[i]=heap[child];i=child;}heap[i]=tail;}return root[0];};
    cost[start]=0;push(start,heuristic(start));
    while(heap.length){const id=pop();if(closed[id])continue;if(id===goal)break;closed[id]=1;
      const x=id%gw,y=Math.floor(id/gw);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,next=yy*gw+xx;
        if(xx<1||yy<1||xx>=gw-1||yy>=gh-1||!walk[next]||closed[next])continue;
        if(dx&&dy&&(!walk[y*gw+xx]||!walk[yy*gw+x]))continue;
        const score=cost[id]+(dx&&dy?Math.SQRT2:1);if(score>=cost[next])continue;cost[next]=score;parent[next]=id;push(next,score+heuristic(next));
      }
    }
    if(start!==goal&&parent[goal]<0)return null;
    const raw=[];for(let id=goal;id>=0;id=parent[id]){raw.push([id%gw*G,Math.floor(id/gw)*G]);if(id===start)break;}raw.reverse();
    // A* only avoids obstacles. Detour points are added afterward, so the road is not pulled into a straight line between the two towns.
    const simple=[raw[0]];for(let i=0;i<raw.length-1;){let end=i+1;for(let j=Math.min(raw.length-1,i+20);j>i+1;j--)if(lineFree(raw[i],raw[j])){end=j;break;}simple.push(raw[end]);i=end;}
    return simple.length>1?simple:null;
  }
  function roundedRoad(simple){
    const smooth=[];
    for(let i=0;i<simple.length;i++){
      if(i===0||i===simple.length-1){smooth.push(simple[i]);continue;}
      const prev=simple[i-1],p=simple[i],next=simple[i+1],before=Math.hypot(prev[0]-p[0],prev[1]-p[1]),after=Math.hypot(next[0]-p[0],next[1]-p[1]);
      if(before<.1||after<.1)continue;
      const inRatio=Math.min(.4,30/before),outRatio=Math.min(.4,30/after);
      const inPoint=[p[0]+(prev[0]-p[0])*inRatio,p[1]+(prev[1]-p[1])*inRatio],outPoint=[p[0]+(next[0]-p[0])*outRatio,p[1]+(next[1]-p[1])*outRatio];
      const curve=[];for(let k=0;k<=10;k++){const t=k/10;curve.push([(1-t)*(1-t)*inPoint[0]+2*t*(1-t)*p[0]+t*t*outPoint[0],(1-t)*(1-t)*inPoint[1]+2*t*(1-t)*p[1]+t*t*outPoint[1]]);}
      if(curve.every(p=>validPoint(...p))&&curve.every((p,j)=>!j||lineFree(curve[j-1],p)))smooth.push(...curve);else smooth.push(p);
    }
    return smooth.length>1?smooth:null;
  }
  function windingRoute(a,b,salt){
    const shortest=route(a,b);if(!shortest)return null;
    const spine=continentRoute(shortest,{name:'start'},{name:'end'}),points=[shortest[0]];
    let cursor=shortest[0],distance=45+rnd1(salt,3,1210)*40;
    for(let k=1;distance<spine.length-35;k++){
      const pose=continentPose(spine,distance),offset=(rnd1(k,salt,1211)*2-1)*74;
      for(const factor of [1,.72,.45,-.7]){
        const x=pose.x-Math.sin(pose.h)*offset*factor,y=pose.y+Math.cos(pose.h)*offset*factor;
        if(!validPoint(x,y))continue;
        const segment=route(cursor,[x,y]);if(!segment)continue;
        const length=continentRoute(segment,{name:'a'},{name:'b'}).length;
        if(length>Math.hypot(x-cursor[0],y-cursor[1])*1.9+25)continue;
        points.push(...segment.slice(1));cursor=segment[segment.length-1];break;
      }
      distance+=48+rnd1(k,salt,1212)*62;
    }
    const tail=route(cursor,b);if(!tail)return roundedRoad(shortest);
    points.push(...tail.slice(1));
    const rounded=roundedRoad(points);return rounded?irregularRoad(rounded,salt):null;
  }
  function irregularRoad(points,salt){
    const base=continentRoute(points,{name:'start'},{name:'end'});
    // Aperiodic wobble at three scales: a wide gentle detour, a short bend, and fine wiggles, so the road does not sway left and right at an even spacing.
    const noise=(distance,spacing,channel)=>{
      const u=distance/spacing+salt*.73,k=Math.floor(u),t=u-k;
      const value=i=>rnd1(i,salt,channel)*2-1;
      const a=value(k-1),b=value(k),c=value(k+1),d=value(k+2);
      return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    };
    const samples=[];
    for(let i=0;i<points.length;i++){
      if(i){const steps=Math.ceil((base.lengths[i]-base.lengths[i-1])/3);
        for(let k=1;k<steps;k++)samples.push(base.lengths[i-1]+(base.lengths[i]-base.lengths[i-1])*k/steps);
      }
      samples.push(base.lengths[i]);
    }
    const result=[];
    for(const distance of samples){
      const p=continentPose(base,distance),before=continentPose(base,distance-8),after=continentPose(base,distance+8);
      const heading=Math.atan2(after.y-before.y,after.x-before.x),edge=Math.min(1,distance/22,(base.length-distance)/22);
      const offset=(noise(distance,83+rnd1(salt,7,1220)*27,1221)*19+noise(distance,23+rnd1(salt,8,1220)*14,1222)*15.5+noise(distance,10+rnd1(salt,9,1220)*6,1223)*4)*edge*edge*(3-2*edge);
      let candidate=null;
      for(const factor of [1,.75,.5,.25,0]){
        const point=[p.x-Math.sin(heading)*offset*factor,p.y+Math.cos(heading)*offset*factor];
        if(validPoint(...point)&&(!result.length||lineFree(result[result.length-1],point))){candidate=point;break;}
      }
      // In a narrow passage, keep the base path that already passed the checks. Do not push a fine bend out into the sea.
      if(!candidate)return points;
      if(!result.length||Math.hypot(candidate[0]-result[result.length-1][0],candidate[1]-result[result.length-1][1])>.01)result.push(candidate);
    }
    return result;
  }
  const pairs=[],roots=w.towns.map((_,i)=>i),find=i=>{while(roots[i]!==i)i=roots[i];return i;};
  for(let i=0;i<w.towns.length;i++)for(let j=i+1;j<w.towns.length;j++)pairs.push({i,j,d:Math.hypot(w.towns[i].x-w.towns[j].x,w.towns[i].y-w.towns[j].y)});
  pairs.sort((a,b)=>a.d-b.d);w.tradeRoutes=[];
  for(const pair of pairs){
    if(find(pair.i)===find(pair.j))continue;
    const a=w.towns[pair.i],b=w.towns[pair.j],points=windingRoute([a.x+28,a.y+14],[b.x+28,b.y+14],pair.i*17+pair.j);if(!points)continue;
    roots[find(pair.j)]=find(pair.i);const road=continentRoute(points,a,b);if(road.length<40)continue;
    w.tradeRoutes.push(road);w.roads.push(points);
    for(let distance=0;distance<=road.length;distance+=5){
      const {x,y,h}=continentPose(road,distance);occ.mark(x-10,y-10,x+10,y+10,6);
      if(riv.at(x,y)&&!w.bridges.some(b=>Math.hypot(b.x-x,b.y-y)<18)){
        const crossing=riv.crossing?.(x,y,h);
        if(crossing&&!w.bridges.some(b=>Math.hypot(b.x-crossing.x,b.y-crossing.y)<crossing.span*.7))w.bridges.push({...crossing,a:h});
      }
    }
  }
  w.wagons=[];w.previousWagons=previous?.wagons||[];w.tradeN=-1;
}

function continentPose(route,distance) {
  const s=Math.max(0,Math.min(route.length,distance));let lo=0,hi=route.lengths.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(route.lengths[mid]<=s)lo=mid;else hi=mid;}
  const a=route.points[lo],b=route.points[hi],t=(s-route.lengths[lo])/Math.max(.001,route.lengths[hi]-route.lengths[lo]);
  return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,h:Math.atan2(b[1]-a[1],b[0]-a[0])};
}
function stepContinentTrade(dt,w) {
  const want=w.tradeRoutes.length?Math.max(0,Math.min(8,Math.round(P.wagons))):0;
  if(w.tradeN!==want){
    const previous=w.wagons.concat(w.previousWagons||[]);w.previousWagons=[];
    w.wagons=Array.from({length:want},(_,i)=>{
      const route=w.tradeRoutes[i%w.tradeRoutes.length],id=route.key+'#'+Math.floor(i/w.tradeRoutes.length);
      const old=previous.find(v=>v.id===id),phase=rnd1(i,13,1193);
      const s=old?old.s/old.route.length*route.length:route.length*(.18+.64*phase),dir=old?old.dir:phase>.5?1:-1,pose=continentPose(route,s);
      const nearby=old&&Math.hypot(old.pose.x-pose.x,old.pose.y-pose.y)<25;
      const heading=nearby?old.heading:pose.h+(dir<0?Math.PI:0);
      return {id,route,s,dir,wait:old?.wait||0,speed:10+phase*5,phase:old?.phase||phase*6.28,heading,alpha:nearby?old.alpha:0,deliveries:old?.deliveries||0,pose};
    });w.tradeN=want;
  }
  for(const wagon of w.wagons){
    const resting=wagon.wait>0;
    if(resting)wagon.wait=Math.max(0,wagon.wait-dt);
    else {wagon.s+=wagon.dir*wagon.speed*dt;wagon.phase+=dt*9;
      if(wagon.s>=wagon.route.length||wagon.s<=0){wagon.s=Math.max(0,Math.min(wagon.route.length,wagon.s));wagon.dir*=-1;wagon.wait=3.2;wagon.deliveries++;}
    }
    const pose=continentPose(wagon.route,wagon.s),heading=pose.h+(wagon.dir<0?Math.PI:0),angle=Math.atan2(Math.sin(heading-wagon.heading),Math.cos(heading-wagon.heading));
    wagon.heading+=Math.sign(angle)*Math.min(Math.abs(angle),dt*(resting?2.3:3.2));wagon.pose=pose;
    wagon.alpha+=(1-wagon.alpha)*(1-Math.exp(-dt*2.4));wagon.moving=!resting;
  }
}

const CONTINENT_WAGON_VS=`#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uWagon;
uniform float uSprite;
out vec2 wagonUV;
out vec2 worldPoint;
void main(){
 vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1)),local=(corner-.5)*vec2(32.0,18.0);
 float c=cos(uWagon.z),s=sin(uWagon.z);worldPoint=uWagon.xy+vec2(c*local.x-s*local.y,s*local.x+c*local.y);
 gl_Position=vec4(worldPoint.x/uRes.x*2.0-1.0,1.0-worldPoint.y/uRes.y*2.0,0,1);
 wagonUV=(corner+vec2(mod(uSprite,4.0),floor(uSprite/4.0)))/vec2(4.0,2.0);
}`;
const CONTINENT_WAGON_FS=`#version 300 es
precision highp float;
uniform sampler2D uWagonAtlas,uFA,uFB;
uniform vec2 uGrid;
uniform float uStep,uMix,uOpacity;
in vec2 wagonUV;
in vec2 worldPoint;
out vec4 o;
void main(){
 vec4 sprite=texture(uWagonAtlas,wagonUV);vec2 uv=(worldPoint/uStep+.5)/uGrid;
 float land=mix(texture(uFA,uv).r,texture(uFB,uv).r,uMix);
 float alpha=sprite.a*uOpacity*smoothstep(8.0,24.0,land);o=vec4(sprite.rgb*alpha,alpha);
}`;
let continentWagonPass=null;
function paintContinentWagon(ctx,cargo,frame) {
  const ink='#514a38',wood='#c9bb96',paper='#e6d9b5',shade='#a99e7e';
  ctx.strokeStyle=ink;ctx.lineWidth=.65;ctx.lineCap='round';ctx.lineJoin='round';
  const line=(points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  const box=(x,y,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);};
  const ellipse=(x,y,rx,ry,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
  // Top-down wooden wagon: narrow wheels sit along both sides of the bed. Planks, beams, and cargo are drawn with fine ink.
  ctx.save();ctx.globalAlpha=.11;ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(-11,1.3,15,8.6,0,0,Math.PI*2);ctx.ellipse(15,1.4,9,4.8,0,0,Math.PI*2);ctx.fill();ctx.restore();
  line([[-25,0],[-1,0]]);line([[-22,-8.6],[-22,8.6]]);line([[-7,-8.6],[-7,8.6]]);
  for(const x of [-22,-7])for(const y of [-7.6,7.6]){
    box(x-2.8,y-1,5.6,2,shade);line([[x-2,y],[x+2,y]]);
    for(let k=-1;k<=1;k++)line([[x+k*1.4,y-.7],[x+k*1.4+.4,y+.7]]);
  }
  box(-26,-6.2,25,12.4,wood);box(-24.7,-4.9,22.4,9.8,paper);
  ctx.lineWidth=.4;
  for(let x=-22;x<-3;x+=3.4)line([[x,-4.8],[x,4.8]]);
  line([[-25.5,-6.5],[-.5,-6.5]]);line([[-25.5,6.5],[-.5,6.5]]);
  line([[-25,-4.7],[-25,4.7]]);line([[-2,-4.7],[-2,4.7]]);
  ctx.lineWidth=.6;
  if(cargo===0){
    for(const [x,y,w,h] of [[-23.5,-3.9,7,6.1],[-15.5,-4.2,5.8,4.6],[-14.5,.9,8.8,3.3]]){
      box(x,y,w,h,wood);line([[x+.6,y+.5],[x+w-.6,y+h-.5]]);line([[x+w-.6,y+.5],[x+.6,y+h-.5]]);
      ctx.lineWidth=.35;line([[x+1,y+h*.5],[x+w-1,y+h*.5]]);ctx.lineWidth=.6;
    }
  }else{
    for(const [x,y,angle] of [[-21,-1.2,-.2],[-15,1.4,.3],[-9,-1.5,-.3]]){
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ellipse(0,0,3.8,2.6,wood);
      line([[-2,-1.5],[-1.6,1.5]]);line([[2,-1.2],[2.8,-2],[3.4,-1.5]]);ctx.restore();
    }
  }
  // Shafts and straps run from the front of the wagon to both sides of the horse, so it does not read as a horse standing in profile.
  line([[-1,-5],[12,-3.5]]);line([[-1,5],[12,3.5]]);
  const gait=Math.sin(frame*Math.PI/2)*1.35;
  for(const [x,side] of [[9,-1],[18,-1],[9,1],[18,1]]){
    const stride=(x===9?gait:-gait)*side;
    line([[x,side*2],[x+stride-1,side*4.4],[x+stride+.5,side*5.2]]);
    ctx.lineWidth=1;line([[x+stride+.2,side*5.2],[x+stride+1.6,side*5.2]]);ctx.lineWidth=.65;
  }
  ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(8,0);ctx.bezierCurveTo(5,-1.2,4.7,-.5,3.8,1);ctx.bezierCurveTo(6.3,1.8,7,1,8,1);ctx.fill();ctx.stroke();
  ellipse(14,0,7.1,3.5,paper);
  ctx.fillStyle=paper;ctx.beginPath();ctx.moveTo(18,-2.2);ctx.quadraticCurveTo(21,-2.7,24,-1.8);ctx.lineTo(27,-1.3);ctx.quadraticCurveTo(28,0,27,1.3);ctx.lineTo(24,1.8);ctx.quadraticCurveTo(21,2.7,18,2.2);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(22,-1.9);ctx.lineTo(23.3,-3.3);ctx.lineTo(24,-1.9);ctx.moveTo(22,1.9);ctx.lineTo(23.3,3.3);ctx.lineTo(24,1.9);ctx.stroke();
  ctx.lineWidth=.45;line([[18,-.4],[24,-.4]]);line([[25.8,-1.5],[25.8,1.5]]);
  line([[17,-2.4],[18,-2.9],[19,-2.5],[20,-2.9],[21,-2.2]]);
  ctx.fillStyle=ink;for(const side of [-1,1]){ctx.beginPath();ctx.arc(24,side*1.35,.3,0,Math.PI*2);ctx.fill();}
  line([[11,-3.3],[10.7,3.3]]);line([[17,-3],[17,3]]);line([[11,-2.5],[17,-2.4]]);line([[11,2.5],[17,2.4]]);
  // From above: the driver's hat brim, shoulders, and two reins.
  ellipse(-.2,0,1.6,2.6,shade);ellipse(.8,0,1.5,1.5,paper);
  line([[1,-1.8],[3,-2],[23,-1.5]]);line([[1,1.8],[3,2],[23,1.5]]);
}
function makeContinentWagonAtlas() {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;const ctx=canvas.getContext('2d');ctx.scale(2,2);
  for(let cargo=0;cargo<2;cargo++)for(let frame=0;frame<4;frame++){
    ctx.save();ctx.translate(frame*64+32,cargo*36+18);paintContinentWagon(ctx,cargo,frame);ctx.restore();
  }
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return texture;
}
function drawContinentTrade() {
  if(!world?.wagons?.length)return;
  if(!continentWagonPass)continentWagonPass={...program(CONTINENT_WAGON_FS,CONTINENT_WAGON_VS),atlas:makeContinentWagonAtlas()};
  const pass=continentWagonPass,U=pass.U;gl.useProgram(pass.p);
  gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,pass.atlas);gl.uniform1i(U.uWagonAtlas,8);gl.uniform1i(U.uFA,1);gl.uniform1i(U.uFB,2);
  gl.uniform2f(U.uRes,cv.width/cv._scale,cv.height/cv._scale);gl.uniform2f(U.uGrid,Gw,Gh);gl.uniform1f(U.uStep,STEP);gl.uniform1f(U.uMix,curMix);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  for(const wagon of world.wagons){
    const pose=wagon.pose,side=wagon.dir*2.1;
    gl.uniform4f(U.uWagon,pose.x-Math.sin(pose.h)*side,pose.y+Math.cos(pose.h)*side,wagon.heading,0);
    gl.uniform1f(U.uSprite,(wagon.moving?Math.floor(wagon.phase/(Math.PI*.5))%4:0)+(wagon.dir<0?4:0));gl.uniform1f(U.uOpacity,wagon.alpha);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  gl.disable(gl.BLEND);
}
