import { rouletteColor, roulettePockets } from "../games/roulette.js";

const TAU = Math.PI * 2;
const easeOutQuint = (value) => 1 - Math.pow(1-value,5);
const easeInOut = (value) => value < .5 ? 4*value**3 : 1-Math.pow(-2*value+2,3)/2;

export class RouletteWheelRenderer {
  constructor(canvas, { variant="european", quality="high", audio=null }={}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d",{alpha:true,desynchronized:true});
    this.variant = variant;
    this.pockets = roulettePockets(variant);
    this.quality = quality;
    this.audio = audio;
    this.wheelAngle = 0;
    this.ballAngle = -.6;
    this.ballRadius = .78;
    this.winner = null;
    this.focus = 0;
    this.frame = 0;
    this.lastTick = -1;
    this.resize = this.resize.bind(this);
    addEventListener("resize",this.resize,{passive:true});
    this.resize();
    this.draw();
  }

  setVariant(variant) {
    this.variant = variant;
    this.pockets = roulettePockets(variant);
    this.winner = null;
    this.draw();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = this.quality === "ultra" ? Math.min(devicePixelRatio,2) : this.quality === "high" ? Math.min(devicePixelRatio,1.5) : 1;
    this.width = Math.max(320,bounds.width || 650);
    this.height = Math.max(280,bounds.height || 520);
    this.canvas.width = Math.round(this.width*pixelRatio);
    this.canvas.height = Math.round(this.height*pixelRatio);
    this.context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    this.draw();
  }

  pocketAngle(value) {
    const index = this.pockets.findIndex((pocket)=>String(pocket)===String(value));
    return index<0 ? 0 : index/this.pockets.length*TAU;
  }

  async spinTo(result, { duration=5600, reduced=false }={}) {
    this.winner = null;
    this.focus = 0;
    this.lastTick = -1;
    const startWheel = this.wheelAngle;
    const startBall = this.ballAngle;
    const spins = reduced ? 2 : 7;
    const ballSpins = reduced ? 3 : 12;
    const finalWheel = startWheel + TAU*spins + .35;
    // El centro visual de cada casilla se dibuja a -90° respecto del índice.
    const targetLocal = this.pocketAngle(result)-Math.PI/2;
    const finalBall = finalWheel + targetLocal;
    const rawBallTravel = startBall-TAU*ballSpins;
    const correction = finalBall - rawBallTravel;
    const start = performance.now();
    return new Promise((resolve)=>{
      const animate = (now)=>{
        const progress = Math.min(1,(now-start)/duration);
        const wheelEase = easeOutQuint(progress);
        this.wheelAngle = startWheel+(finalWheel-startWheel)*wheelEase;
        const ballBase = rawBallTravel*easeInOut(progress)+startBall*(1-easeInOut(progress));
        this.ballAngle = ballBase+correction*easeOutQuint(Math.max(0,(progress-.56)/.44));
        this.ballRadius = progress<.58 ? .80 : .80-.21*easeOutQuint((progress-.58)/.42);
        if (progress>.72 && progress<.97) this.ballRadius += Math.abs(Math.sin(progress*95))*(1-progress)*.065;
        const tickIndex = Math.floor(((this.ballAngle-this.wheelAngle)/TAU*this.pockets.length)%this.pockets.length);
        if (progress>.5 && tickIndex!==this.lastTick) {
          this.lastTick=tickIndex;
          this.audio?.play("ruletaClic");
        }
        this.draw();
        if (progress<1) requestAnimationFrame(animate);
        else {
          this.winner=result;
          this.focus=1;
          this.ballRadius=.59;
          this.audio?.play("bolaCae");
          this.draw();
          resolve(result);
        }
      };
      requestAnimationFrame(animate);
    });
  }

  draw() {
    const ctx=this.context;
    if(!ctx||!this.width)return;
    ctx.clearRect(0,0,this.width,this.height);
    const cx=this.width*.5,cy=this.height*.49;
    const radius=Math.min(this.width*.43,this.height*.46);
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(1,.72);
    this.drawShadow(ctx,radius);
    this.drawRim(ctx,radius);
    this.drawPockets(ctx,radius);
    this.drawBowl(ctx,radius);
    this.drawBall(ctx,radius);
    ctx.restore();
    this.drawReflection(ctx,cx,cy,radius);
  }

  drawShadow(ctx,radius) {
    ctx.save();
    ctx.scale(1,1.1);
    const gradient=ctx.createRadialGradient(0,radius*.24,radius*.15,0,radius*.35,radius*1.08);
    gradient.addColorStop(0,"rgba(0,0,0,.8)");gradient.addColorStop(1,"transparent");
    ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(0,radius*.38,radius*1.08,radius*.58,0,0,TAU);ctx.fill();ctx.restore();
  }

  drawRim(ctx,radius) {
    const gradient=ctx.createRadialGradient(-radius*.35,-radius*.45,radius*.08,0,0,radius);
    gradient.addColorStop(0,"#fff0bd");gradient.addColorStop(.2,"#b7883d");gradient.addColorStop(.55,"#33210f");gradient.addColorStop(.78,"#d1a65d");gradient.addColorStop(1,"#231306");
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.fill();
    ctx.strokeStyle="rgba(255,238,185,.75)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,radius*.96,0,TAU);ctx.stroke();
    ctx.fillStyle="#090d0b";ctx.beginPath();ctx.arc(0,0,radius*.88,0,TAU);ctx.fill();
  }

  drawPockets(ctx,radius) {
    const count=this.pockets.length,step=TAU/count,outer=radius*.865,inner=radius*.59;
    for(let index=0;index<count;index+=1){
      const pocket=this.pockets[index];
      const angle=this.wheelAngle+index*step-Math.PI/2;
      const isWinner=this.winner!==null&&String(pocket)===String(this.winner);
      ctx.beginPath();ctx.arc(0,0,outer,angle-step*.48,angle+step*.48);ctx.arc(0,0,inner,angle+step*.48,angle-step*.48,true);ctx.closePath();
      const color=rouletteColor(pocket);
      ctx.fillStyle=isWinner?"#fff0a6":color==="red"?"#d51f42":color==="green"?"#08a66b":"#111614";
      ctx.shadowBlur=isWinner?28:0;ctx.shadowColor="#ffd65d";ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle="rgba(226,190,117,.72)";ctx.lineWidth=1;ctx.stroke();
      ctx.save();ctx.rotate(angle);ctx.translate(0,-radius*.755);ctx.rotate(Math.PI/2);ctx.fillStyle=isWinner?"#291300":"#fff7e6";ctx.font=`700 ${Math.max(8,radius*.045)}px monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(pocket),0,0);ctx.restore();
      ctx.save();ctx.rotate(angle);ctx.translate(0,-radius*.585);ctx.fillStyle="#d1ad69";ctx.fillRect(-radius*.009,-radius*.055,radius*.018,radius*.11);ctx.restore();
    }
  }

  drawBowl(ctx,radius) {
    const gradient=ctx.createRadialGradient(-radius*.18,-radius*.22,0,0,0,radius*.58);
    gradient.addColorStop(0,"#71867a");gradient.addColorStop(.23,"#173c2d");gradient.addColorStop(.67,"#06120d");gradient.addColorStop(1,"#020604");
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,radius*.575,0,TAU);ctx.fill();
    ctx.strokeStyle="#d6b26d";ctx.lineWidth=radius*.035;ctx.beginPath();ctx.arc(0,0,radius*.42,0,TAU);ctx.stroke();
    const hub=ctx.createRadialGradient(-radius*.08,-radius*.1,0,0,0,radius*.24);hub.addColorStop(0,"#fff1bd");hub.addColorStop(.16,"#b8883f");hub.addColorStop(.5,"#33200d");hub.addColorStop(1,"#090704");ctx.fillStyle=hub;ctx.beginPath();ctx.arc(0,0,radius*.23,0,TAU);ctx.fill();
    ctx.fillStyle="#d7b069";ctx.font=`italic ${radius*.18}px Georgia`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",0,radius*.01);
  }

  drawBall(ctx,radius) {
    const x=Math.cos(this.ballAngle)*radius*this.ballRadius;
    const y=Math.sin(this.ballAngle)*radius*this.ballRadius;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle="rgba(0,0,0,.55)";ctx.beginPath();ctx.ellipse(radius*.018,radius*.035,radius*.045,radius*.025,0,0,TAU);ctx.fill();
    const ball=ctx.createRadialGradient(-radius*.015,-radius*.02,0,0,0,radius*.052);ball.addColorStop(0,"#fff");ball.addColorStop(.42,"#f1eee5");ball.addColorStop(1,"#777b78");ctx.fillStyle=ball;ctx.shadowBlur=12;ctx.shadowColor="rgba(255,255,255,.8)";ctx.beginPath();ctx.arc(0,0,radius*.045,0,TAU);ctx.fill();ctx.restore();
  }

  drawReflection(ctx,cx,cy,radius) {
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.28);const gradient=ctx.createLinearGradient(-radius,0,radius,0);gradient.addColorStop(0,"transparent");gradient.addColorStop(.5,"rgba(255,255,255,.085)");gradient.addColorStop(1,"transparent");ctx.fillStyle=gradient;ctx.fillRect(-radius*1.1,-radius*.54,radius*2.2,radius*.12);ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    removeEventListener("resize",this.resize);
  }
}
