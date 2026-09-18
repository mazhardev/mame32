import type{ArcadeEngine}from'../_shared/arcade/CanvasRunner';import{backdrop}from'../_shared/arcade/CanvasRunner';import type{DifficultySetting}from'@/types';
export class PongEngine implements ArcadeEngine{
 score=0;over=false;won=false;label='First to 7';player=200;opponent=200;ball={x:320,y:200,vx:260,vy:90};conceded=0;private ai:number;
 constructor(difficulty:DifficultySetting){this.ai={easy:170,normal:230,hard:300}[difficulty];}
 pointer(_x:number,y:number){this.player=Math.max(40,Math.min(360,y));}
 update(dt:number,keys:Set<string>){if(this.over)return;
  this.player=Math.max(40,Math.min(360,this.player+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*340*dt));
  this.opponent+=Math.sign(this.ball.y-this.opponent)*Math.min(Math.abs(this.ball.y-this.opponent),this.ai*dt);
  const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.y<8){b.y=8;b.vy=Math.abs(b.vy);}if(b.y>392){b.y=392;b.vy=-Math.abs(b.vy);}
  if(b.vx<0&&b.x<=38&&b.x>=16&&Math.abs(b.y-this.player)<48){b.x=38;b.vx=Math.min(480,Math.abs(b.vx)*1.04);b.vy=(b.y-this.player)*6;}
  if(b.vx>0&&b.x>=602&&b.x<=624&&Math.abs(b.y-this.opponent)<48){b.x=602;b.vx=-Math.min(480,Math.abs(b.vx)*1.04);b.vy=(b.y-this.opponent)*6;}
  if(b.x<0||b.x>640){if(b.x>640)this.score+=100;else this.conceded++;this.ball={x:320,y:200,vx:b.x>640?-260:260,vy:(Math.random()-.5)*240};}
  this.label=`${this.score/100} — ${this.conceded}`;if(this.score>=700||this.conceded>=7){this.over=true;this.won=this.score>=700;}
 }
 draw(c:CanvasRenderingContext2D){backdrop(c);c.setLineDash([8,8]);c.strokeStyle='#475569';c.beginPath();c.moveTo(320,0);c.lineTo(320,400);c.stroke();c.setLineDash([]);c.fillStyle='#7dd3fc';c.fillRect(22,this.player-40,10,80);c.fillStyle='#fda4af';c.fillRect(608,this.opponent-40,10,80);c.fillStyle='#fff';c.beginPath();c.arc(this.ball.x,this.ball.y,8,0,Math.PI*2);c.fill();c.font='32px monospace';c.fillText(String(this.score/100),260,45);c.fillText(String(this.conceded),355,45);}
}
